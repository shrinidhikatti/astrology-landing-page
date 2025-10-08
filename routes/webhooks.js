const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper function to verify Razorpay webhook signature
const verifyWebhookSignature = (body, signature, secret) => {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
};

// Helper function to log webhook events
const logWebhook = (type, data) => {
    const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type,
        data
    };
    
    const logFile = path.join(__dirname, '../data/payment_logs.json');
    let logs = [];
    
    try {
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading webhook log file:', error);
        logs = [];
    }
    
    logs.push(logEntry);
    
    try {
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error writing to webhook log file:', error);
    }
};

// Helper function to update order status
const updateOrderStatus = (razorpayOrderId, status, paymentData = null) => {
    const ordersFile = path.join(__dirname, '../data/orders.json');
    
    try {
        let orders = [];
        if (fs.existsSync(ordersFile)) {
            orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        }

        const orderIndex = orders.findIndex(order => order.razorpay_order_id === razorpayOrderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex].status = status;
            orders[orderIndex].updated_at = new Date().toISOString();
            
            if (paymentData) {
                orders[orderIndex].payment_data = paymentData;
                orders[orderIndex].payment_id = paymentData.id;
            }
            
            fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
            
            return orders[orderIndex];
        }
        
        return null;
    } catch (error) {
        console.error('Error updating order status:', error);
        return null;
    }
};

// Helper function to create shipment after successful payment
const createShipmentAfterPayment = async (order, paymentData) => {
    try {
        // Only create shipment for print orders (physical products)
        if (order.package_type !== 'print') {
            console.log(`📧 Digital delivery for order ${order.razorpay_order_id} - no shipping required`);
            return;
        }

        // Extract address details (you might need to adjust based on your data structure)
        const address = order.customer_details.address || '';
        const addressParts = address.split(',').map(part => part.trim());
        
        const shipmentData = {
            order_id: order.razorpay_order_id,
            customer_name: order.customer_details.name,
            customer_email: order.customer_details.email,
            customer_phone: order.customer_details.whatsapp,
            address: address,
            city: addressParts[addressParts.length - 3] || 'Unknown',
            pincode: addressParts[addressParts.length - 1] || '000000',
            state: addressParts[addressParts.length - 2] || 'Unknown',
            package_type: order.package_type,
            amount: order.amount
        };

        // Call shipment creation API
        const response = await axios.post(
            `${process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000'}/api/shipments/create`,
            shipmentData
        );

        console.log('📦 Shipment created automatically:', response.data);
        
        logWebhook('SHIPMENT_AUTO_CREATED', {
            order_id: order.razorpay_order_id,
            shipment_data: response.data
        });

    } catch (error) {
        console.error('❌ Failed to create shipment automatically:', error.message);
        
        logWebhook('SHIPMENT_AUTO_ERROR', {
            order_id: order.razorpay_order_id,
            error: error.message
        });
    }
};

// Helper function to send confirmation emails
const sendConfirmationEmail = async (order, paymentData) => {
    try {
        // Update Google Sheets with payment confirmation
        await axios.post(process.env.GOOGLE_SHEETS_URL, {
            ...order.customer_details,
            orderId: order.razorpay_order_id,
            paymentId: paymentData.id,
            status: 'paid',
            amount: order.amount,
            timestamp: new Date().toISOString(),
            package: order.package_type
        });

        console.log('📊 Google Sheets updated with payment confirmation');

    } catch (error) {
        console.error('❌ Failed to update Google Sheets:', error.message);
    }
};

// POST /api/webhooks/razorpay - Handle Razorpay webhooks
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const body = req.body.toString();

        // Verify webhook signature
        if (!verifyWebhookSignature(body, signature, process.env.RAZORPAY_WEBHOOK_SECRET)) {
            console.error('❌ Invalid webhook signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(body);
        
        console.log(`🔔 Webhook received: ${event.event}`);

        switch (event.event) {
            case 'payment.captured':
                await handlePaymentCaptured(event);
                break;
                
            case 'payment.failed':
                await handlePaymentFailed(event);
                break;
                
            case 'order.paid':
                await handleOrderPaid(event);
                break;
                
            default:
                console.log(`ℹ️ Unhandled webhook event: ${event.event}`);
        }

        res.json({ status: 'success' });

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Handle payment captured event
const handlePaymentCaptured = async (event) => {
    const payment = event.payload.payment.entity;
    
    console.log(`💰 Payment captured: ${payment.id} for order: ${payment.order_id}`);
    
    // Update order status
    const updatedOrder = updateOrderStatus(payment.order_id, 'paid', payment);
    
    if (updatedOrder) {
        // Log successful payment
        logWebhook('PAYMENT_CAPTURED', {
            payment_id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount / 100, // Convert from paise
            customer_email: payment.email,
            customer_contact: payment.contact
        });

        // Send confirmation email and update sheets
        await sendConfirmationEmail(updatedOrder, payment);
        
        // Create shipment automatically for print orders
        await createShipmentAfterPayment(updatedOrder, payment);
        
        console.log(`✅ Order ${payment.order_id} processed successfully`);
    } else {
        console.error(`❌ Order not found: ${payment.order_id}`);
    }
};

// Handle payment failed event
const handlePaymentFailed = async (event) => {
    const payment = event.payload.payment.entity;
    
    console.log(`❌ Payment failed: ${payment.id} for order: ${payment.order_id}`);
    
    // Update order status
    updateOrderStatus(payment.order_id, 'failed', payment);
    
    // Log failed payment
    logWebhook('PAYMENT_FAILED', {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount / 100,
        error_code: payment.error_code,
        error_description: payment.error_description
    });
};

// Handle order paid event
const handleOrderPaid = async (event) => {
    const order = event.payload.order.entity;
    
    console.log(`📋 Order paid: ${order.id}`);
    
    // Update order status
    updateOrderStatus(order.id, 'completed');
    
    // Log order completion
    logWebhook('ORDER_COMPLETED', {
        order_id: order.id,
        amount: order.amount / 100,
        currency: order.currency
    });
};

// GET /api/webhooks/logs - Get webhook logs
router.get('/logs', (req, res) => {
    try {
        const logFile = path.join(__dirname, '../data/payment_logs.json');
        
        if (!fs.existsSync(logFile)) {
            return res.json([]);
        }

        const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        res.json(logs.slice(-50)); // Return last 50 logs
    } catch (error) {
        console.error('Error fetching webhook logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// GET /api/webhooks/test - Test webhook endpoint
router.get('/test', (req, res) => {
    res.json({
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

module.exports = router;