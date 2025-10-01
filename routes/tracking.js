const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET /api/tracking/order/:orderId - Track order by order ID
router.get('/order/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Get order details
        const ordersFile = path.join(__dirname, '../data/orders.json');
        if (!fs.existsSync(ordersFile)) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const order = orders.find(o => o.id === orderId || o.razorpay_order_id === orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get payment logs for this order
        const paymentLogsFile = path.join(__dirname, '../data/payment_logs.json');
        let paymentLogs = [];
        if (fs.existsSync(paymentLogsFile)) {
            const allLogs = JSON.parse(fs.readFileSync(paymentLogsFile, 'utf8'));
            paymentLogs = allLogs.filter(log => 
                log.data && (
                    log.data.order_id === order.razorpay_order_id ||
                    log.data.order_id === order.id
                )
            );
        }

        // Get shipment logs for this order
        const shipmentLogsFile = path.join(__dirname, '../data/shiprocket_logs.json');
        let shipmentLogs = [];
        if (fs.existsSync(shipmentLogsFile)) {
            const allLogs = JSON.parse(fs.readFileSync(shipmentLogsFile, 'utf8'));
            shipmentLogs = allLogs.filter(log => 
                log.data && (
                    log.data.order_id === order.razorpay_order_id ||
                    log.data.order_id === order.id
                )
            );
        }

        // Compile tracking information
        const trackingInfo = {
            order: {
                id: order.id,
                razorpay_order_id: order.razorpay_order_id,
                status: order.status,
                amount: order.amount,
                currency: order.currency,
                package_type: order.package_type,
                created_at: order.created_at,
                updated_at: order.updated_at
            },
            customer: order.customer_details,
            timeline: []
        };

        // Add order creation to timeline
        trackingInfo.timeline.push({
            timestamp: order.created_at,
            status: 'Order Created',
            description: 'Order has been created and is awaiting payment',
            type: 'order'
        });

        // Add payment events to timeline
        paymentLogs.forEach(log => {
            let status, description;
            switch (log.type) {
                case 'PAYMENT_CAPTURED':
                    status = 'Payment Successful';
                    description = `Payment of ₹${log.data.amount} has been captured successfully`;
                    break;
                case 'PAYMENT_FAILED':
                    status = 'Payment Failed';
                    description = `Payment failed: ${log.data.error_description || 'Unknown error'}`;
                    break;
                case 'ORDER_COMPLETED':
                    status = 'Order Completed';
                    description = 'Order has been completed successfully';
                    break;
                default:
                    return; // Skip unknown payment events
            }
            
            trackingInfo.timeline.push({
                timestamp: log.timestamp,
                status,
                description,
                type: 'payment'
            });
        });

        // Add shipment events to timeline
        shipmentLogs.forEach(log => {
            let status, description;
            switch (log.type) {
                case 'DIGITAL_DELIVERY':
                    status = 'Digital Delivery';
                    description = 'PDF report - no physical shipping required';
                    break;
                case 'SHIPMENT_CREATED':
                    status = 'Shipment Created';
                    description = `Shipment created with AWB: ${log.data.awb_code || 'N/A'}`;
                    trackingInfo.awb_code = log.data.awb_code;
                    trackingInfo.courier_name = log.data.courier_name;
                    break;
                case 'SHIPMENT_AUTO_CREATED':
                    status = 'Auto Shipment';
                    description = 'Shipment created automatically after payment';
                    break;
                case 'SHIPMENT_ERROR':
                    status = 'Shipment Error';
                    description = 'Failed to create shipment - manual intervention required';
                    break;
                default:
                    return; // Skip unknown shipment events
            }
            
            trackingInfo.timeline.push({
                timestamp: log.timestamp,
                status,
                description,
                type: 'shipment'
            });
        });

        // Sort timeline by timestamp
        trackingInfo.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            success: true,
            tracking: trackingInfo
        });

    } catch (error) {
        console.error('Error fetching order tracking:', error);
        res.status(500).json({ error: 'Failed to fetch tracking information' });
    }
});

// GET /api/tracking/shipment/:awb - Track shipment by AWB
router.get('/shipment/:awb', async (req, res) => {
    try {
        const { awb } = req.params;
        
        // This would typically call Shiprocket API
        // For now, return stored shipment logs
        const shipmentLogsFile = path.join(__dirname, '../data/shiprocket_logs.json');
        
        if (!fs.existsSync(shipmentLogsFile)) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        const logs = JSON.parse(fs.readFileSync(shipmentLogsFile, 'utf8'));
        const shipmentLogs = logs.filter(log => 
            log.data && log.data.awb_code === awb
        );

        if (shipmentLogs.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        res.json({
            success: true,
            awb,
            logs: shipmentLogs
        });

    } catch (error) {
        console.error('Error tracking shipment:', error);
        res.status(500).json({ error: 'Failed to track shipment' });
    }
});

// GET /api/tracking/summary - Get tracking summary
router.get('/summary', (req, res) => {
    try {
        const ordersFile = path.join(__dirname, '../data/orders.json');
        const paymentLogsFile = path.join(__dirname, '../data/payment_logs.json');
        const shipmentLogsFile = path.join(__dirname, '../data/shiprocket_logs.json');

        let orders = [];
        let paymentLogs = [];
        let shipmentLogs = [];

        if (fs.existsSync(ordersFile)) {
            orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        }

        if (fs.existsSync(paymentLogsFile)) {
            paymentLogs = JSON.parse(fs.readFileSync(paymentLogsFile, 'utf8'));
        }

        if (fs.existsSync(shipmentLogsFile)) {
            shipmentLogs = JSON.parse(fs.readFileSync(shipmentLogsFile, 'utf8'));
        }

        // Calculate summary statistics
        const summary = {
            total_orders: orders.length,
            orders_by_status: {
                created: orders.filter(o => o.status === 'created').length,
                paid: orders.filter(o => o.status === 'paid').length,
                completed: orders.filter(o => o.status === 'completed').length,
                failed: orders.filter(o => o.status === 'failed').length
            },
            orders_by_package: {
                pdf: orders.filter(o => o.package_type === 'pdf').length,
                print: orders.filter(o => o.package_type === 'print').length
            },
            total_revenue: orders
                .filter(o => o.status === 'paid' || o.status === 'completed')
                .reduce((sum, order) => sum + order.amount, 0),
            recent_orders: orders
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10),
            recent_payments: paymentLogs
                .filter(log => log.type === 'PAYMENT_CAPTURED')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10),
            recent_shipments: shipmentLogs
                .filter(log => log.type === 'SHIPMENT_CREATED')
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10)
        };

        res.json({
            success: true,
            summary
        });

    } catch (error) {
        console.error('Error generating tracking summary:', error);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

module.exports = router;