const express = require('express');
const Razorpay = require('razorpay');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const router = express.Router();

// Debug environment variables
console.log('Environment check:');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'NOT SET');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper function to log activities
const logActivity = (type, data) => {
    const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type,
        data
    };
    
    const logFile = path.join(__dirname, '../data', `${type.toLowerCase()}_logs.json`);
    let logs = [];
    
    try {
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading log file:', error);
        logs = [];
    }
    
    logs.push(logEntry);
    
    try {
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
};

// Helper function to save order
const saveOrder = (order) => {
    const ordersFile = path.join(__dirname, '../data/orders.json');
    let orders = [];
    
    try {
        if (fs.existsSync(ordersFile)) {
            orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading orders file:', error);
        orders = [];
    }
    
    orders.push(order);
    
    try {
        fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('Error writing to orders file:', error);
    }
};

// POST /api/orders/create - Create new Razorpay order
router.post('/create', async (req, res) => {
    try {
        const { 
            amount, 
            currency = 'INR', 
            customer_name, 
            customer_email, 
            package_type,
            birth_date,
            birth_time,
            birth_place,
            whatsapp,
            address
        } = req.body;

        // Validate required fields
        if (!amount || !customer_name || !customer_email) {
            return res.status(400).json({
                error: 'Missing required fields: amount, customer_name, customer_email'
            });
        }

        // Validate amount
        if (amount < 1) {
            return res.status(400).json({
                error: 'Amount must be at least ₹1'
            });
        }

        // Generate unique receipt ID
        const receipt = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create Razorpay order
        const options = {
            amount: amount * 100, // Amount in paise
            currency,
            receipt,
            notes: {
                customer_name,
                customer_email,
                package_type: package_type || '',
                birth_date: birth_date || '',
                birth_time: birth_time || '',
                birth_place: birth_place || '',
                whatsapp: whatsapp || '',
                address: address || ''
            }
        };

        const razorpayOrder = await razorpay.orders.create(options);

        // Create local order record
        const localOrder = {
            id: uuidv4(),
            razorpay_order_id: razorpayOrder.id,
            receipt,
            amount,
            currency,
            status: 'created',
            customer_details: {
                name: customer_name,
                email: customer_email,
                whatsapp,
                address,
                birth_date,
                birth_time,
                birth_place
            },
            package_type,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Save order locally
        saveOrder(localOrder);

        // Log activity
        logActivity('ORDER', {
            action: 'created',
            order_id: razorpayOrder.id,
            amount,
            customer: customer_name
        });

        // Send to Google Sheets (keep existing integration)
        try {
            await axios.post(process.env.GOOGLE_SHEETS_URL, {
                fullName: customer_name,
                email: customer_email,
                whatsapp: whatsapp || '',
                birthDate: birth_date || '',
                birthTime: birth_time || '',
                birthPlace: birth_place || '',
                package: package_type || '',
                amount,
                orderId: razorpayOrder.id,
                status: 'created',
                timestamp: new Date().toISOString()
            });
        } catch (sheetsError) {
            console.error('Google Sheets error:', sheetsError.message);
            // Don't fail the order creation if sheets fails
        }

        res.json({
            success: true,
            order_id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt,
            local_order_id: localOrder.id
        });

    } catch (error) {
        console.error('Order creation error:', error);
        
        logActivity('ORDER', {
            action: 'error',
            error: error.message,
            input: req.body
        });

        res.status(500).json({
            error: 'Failed to create order',
            details: error.message
        });
    }
});

// GET /api/orders - Get all orders
router.get('/', (req, res) => {
    try {
        const ordersFile = path.join(__dirname, '../data/orders.json');
        
        if (!fs.existsSync(ordersFile)) {
            return res.json([]);
        }

        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/:id - Get specific order
router.get('/:id', (req, res) => {
    try {
        const ordersFile = path.join(__dirname, '../data/orders.json');
        
        if (!fs.existsSync(ordersFile)) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const order = orders.find(o => o.id === req.params.id || o.razorpay_order_id === req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

module.exports = router;