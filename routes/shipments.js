const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Shiprocket API class
class ShiprocketAPI {
    constructor() {
        this.baseURL = process.env.SHIPROCKET_API_URL;
        this.email = process.env.SHIPROCKET_EMAIL;
        this.password = process.env.SHIPROCKET_PASSWORD;
        this.token = null;
        this.tokenExpiry = null;
    }

    async authenticate() {
        try {
            const response = await axios.post(`${this.baseURL}/auth/login`, {
                email: this.email,
                password: this.password
            });

            this.token = response.data.token;
            this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
            
            console.log('✅ Shiprocket authenticated successfully');
            return this.token;
        } catch (error) {
            console.error('❌ Shiprocket authentication failed:', error.response?.data || error.message);
            throw new Error('Shiprocket authentication failed');
        }
    }

    async getAuthHeaders() {
        if (!this.token || Date.now() > this.tokenExpiry) {
            await this.authenticate();
        }

        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    async createOrder(orderData) {
        try {
            const headers = await this.getAuthHeaders();
            
            const shipmentData = {
                order_id: orderData.order_id,
                order_date: orderData.order_date,
                pickup_location: "work", // Use the correct pickup location from Shiprocket
                billing_customer_name: orderData.customer_name,
                billing_last_name: "",
                billing_address: orderData.billing_address,
                billing_city: orderData.billing_city,
                billing_pincode: orderData.billing_pincode,
                billing_state: orderData.billing_state,
                billing_country: "India",
                billing_email: orderData.billing_email,
                billing_phone: orderData.billing_phone,
                shipping_is_billing: true,
                order_items: orderData.items,
                payment_method: "Prepaid",
                sub_total: orderData.sub_total,
                length: orderData.length || 10,
                breadth: orderData.breadth || 10,
                height: orderData.height || 5,
                weight: orderData.weight || 0.5
            };

            const response = await axios.post(
                `${this.baseURL}/orders/create/adhoc`,
                shipmentData,
                { headers }
            );

            return response.data;
        } catch (error) {
            console.error('Shiprocket order creation failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async trackShipment(awbNumber) {
        try {
            const headers = await this.getAuthHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/courier/track/awb/${awbNumber}`,
                { headers }
            );

            return response.data;
        } catch (error) {
            console.error('Shipment tracking failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async getServiceability(pickupPincode, deliveryPincode, weight = 0.5) {
        try {
            const headers = await this.getAuthHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&weight=${weight}&cod=0`,
                { headers }
            );

            return response.data;
        } catch (error) {
            console.error('Serviceability check failed:', error.response?.data || error.message);
            throw error;
        }
    }
}

const shiprocket = new ShiprocketAPI();

// Helper function to log shipment activities
const logShipment = (type, data) => {
    const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type,
        data
    };
    
    const logFile = path.join(__dirname, '../data/shiprocket_logs.json');
    let logs = [];
    
    try {
        if (fs.existsSync(logFile)) {
            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error reading shipment log file:', error);
        logs = [];
    }
    
    logs.push(logEntry);
    
    try {
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error writing to shipment log file:', error);
    }
};

// POST /api/shipments/create - Create shipment for paid order
router.post('/create', async (req, res) => {
    try {
        const {
            order_id,
            customer_name,
            customer_email,
            customer_phone,
            address,
            city,
            pincode,
            state,
            package_type,
            amount
        } = req.body;

        // Validate required fields
        if (!order_id || !customer_name || !address || !pincode) {
            return res.status(400).json({
                error: 'Missing required fields: order_id, customer_name, address, pincode'
            });
        }

        // Define package items based on package type
        const packageItems = {
            'pdf': [{
                name: "Jeevan Margadarshana - PDF Report",
                sku: "JM_PDF_001",
                units: 1,
                selling_price: amount,
                discount: 0,
                tax: 0,
                hsn: 998314 // HSN code for digital services
            }],
            'print': [{
                name: "Jeevan Margadarshana - Printed Book",
                sku: "JM_BOOK_001", 
                units: 1,
                selling_price: amount,
                discount: 0,
                tax: 0,
                hsn: 490110 // HSN code for printed books
            }]
        };

        // Skip shipping for PDF orders (digital delivery)
        if (package_type === 'pdf') {
            logShipment('DIGITAL_DELIVERY', {
                order_id,
                customer_name,
                package_type,
                message: 'PDF report - no physical shipping required'
            });

            return res.json({
                success: true,
                message: 'Digital delivery - no shipping required',
                order_id,
                delivery_type: 'digital'
            });
        }

        // Create shipment for physical products
        const shipmentData = {
            order_id,
            order_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            customer_name,
            billing_address: address,
            billing_city: city,
            billing_pincode: pincode,
            billing_state: state,
            billing_email: customer_email,
            billing_phone: customer_phone,
            items: packageItems[package_type] || packageItems['print'],
            sub_total: amount,
            weight: 0.5, // 500g default weight for book
            length: 25,   // cm
            breadth: 20,  // cm  
            height: 3     // cm
        };

        const shiprocketResponse = await shiprocket.createOrder(shipmentData);

        console.log('🔍 Full Shiprocket API Response:', JSON.stringify(shiprocketResponse, null, 2));

        // Log successful shipment creation
        logShipment('SHIPMENT_CREATED', {
            order_id,
            shiprocket_order_id: shiprocketResponse.order_id,
            shipment_id: shiprocketResponse.shipment_id,
            awb_code: shiprocketResponse.awb_code,
            customer_name,
            full_response: shiprocketResponse
        });

        res.json({
            success: true,
            message: 'Shipment created successfully',
            shiprocket_data: {
                order_id: shiprocketResponse.order_id,
                shipment_id: shiprocketResponse.shipment_id,
                awb_code: shiprocketResponse.awb_code,
                courier_name: shiprocketResponse.courier_name
            }
        });

    } catch (error) {
        console.error('Shipment creation error:', error);
        
        logShipment('SHIPMENT_ERROR', {
            error: error.message,
            input: req.body
        });

        res.status(500).json({
            error: 'Failed to create shipment',
            details: error.message
        });
    }
});

// GET /api/shipments/track/:awb - Track shipment by AWB number
router.get('/track/:awb', async (req, res) => {
    try {
        const { awb } = req.params;
        
        const trackingData = await shiprocket.trackShipment(awb);
        
        logShipment('TRACKING_REQUESTED', {
            awb,
            status: trackingData.tracking_data?.track_status
        });

        res.json({
            success: true,
            tracking_data: trackingData
        });

    } catch (error) {
        console.error('Tracking error:', error);
        res.status(500).json({
            error: 'Failed to track shipment',
            details: error.message
        });
    }
});

// POST /api/shipments/serviceability - Check delivery serviceability
router.post('/serviceability', async (req, res) => {
    try {
        const { pickup_pincode = "110001", delivery_pincode, weight = 0.5 } = req.body;
        
        if (!delivery_pincode) {
            return res.status(400).json({
                error: 'delivery_pincode is required'
            });
        }

        const serviceabilityData = await shiprocket.getServiceability(
            pickup_pincode, 
            delivery_pincode, 
            weight
        );

        res.json({
            success: true,
            serviceability: serviceabilityData
        });

    } catch (error) {
        console.error('Serviceability check error:', error);
        res.status(500).json({
            error: 'Failed to check serviceability',
            details: error.message
        });
    }
});

// GET /api/shipments/logs - Get shipment logs
router.get('/logs', (req, res) => {
    try {
        const logFile = path.join(__dirname, '../data/shiprocket_logs.json');
        
        if (!fs.existsSync(logFile)) {
            return res.json([]);
        }

        const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        res.json(logs);
    } catch (error) {
        console.error('Error fetching shipment logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;