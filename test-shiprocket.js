// Test Shiprocket Integration
const axios = require('axios');
require('dotenv').config();

// Test function to verify Shiprocket authentication
async function testShiprocketAuth() {
    try {
        console.log('🚢 Testing Shiprocket Authentication...');
        
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD
        });

        if (response.data.token) {
            console.log('✅ Shiprocket authentication successful!');
            console.log('📄 Token received:', response.data.token.substring(0, 20) + '...');
            return response.data.token;
        } else {
            console.log('❌ Authentication failed - no token received');
            return null;
        }
    } catch (error) {
        console.log('❌ Shiprocket authentication failed:');
        console.log('Error:', error.response?.data || error.message);
        return null;
    }
}

// Test serviceability check
async function testServiceability(token) {
    try {
        console.log('\n🌍 Testing serviceability check...');
        
        const response = await axios.get(
            'https://apiv2.shiprocket.in/v1/external/courier/serviceability',
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    pickup_postcode: '560001', // Bangalore
                    delivery_postcode: '400001', // Mumbai  
                    weight: 0.5,
                    cod: 0
                }
            }
        );

        console.log('✅ Serviceability check successful!');
        console.log('📋 Available couriers:', response.data.data.available_courier_companies.length);
        console.log('🚚 Sample courier:', response.data.data.available_courier_companies[0]?.courier_name || 'None');
        
        return true;
    } catch (error) {
        console.log('❌ Serviceability check failed:');
        console.log('Error:', error.response?.data || error.message);
        return false;
    }
}

// Run tests
async function runTests() {
    console.log('🧪 Starting Shiprocket Integration Tests\n');
    
    // Test 1: Authentication
    const token = await testShiprocketAuth();
    
    if (token) {
        // Test 2: Serviceability
        await testServiceability(token);
    }
    
    console.log('\n🏁 Tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update .env with your Shiprocket credentials');
    console.log('2. Restart the server: npm start');
    console.log('3. Test a print order to trigger shipment creation');
}

runTests();