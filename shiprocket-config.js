// Shiprocket Configuration
const SHIPROCKET_CONFIG = {
    // Your pickup/business address - UPDATE THESE DETAILS
    pickupLocation: {
        pickup_location: "Primary", // Default pickup location name
        name: "Astrology Business", // Your business name
        email: "business@yourdomain.com", // Your business email
        phone: "7760437800", // Your business phone
        address: "Belagavi Business Address", // UPDATE: Your full address
        address_2: "", // Optional: Additional address line
        city: "Belagavi", // UPDATE: Your city
        state: "Karnataka", // UPDATE: Your state
        country: "India",
        pin_code: "590001" // UPDATE: Your correct Belagavi pincode
    },

    // Product configuration
    products: {
        "pdf": {
            name: "Jeevan Margadarshana - PDF Report",
            sku: "JM_PDF_001",
            hsn: 998314, // HSN code for digital services
            weight: 0, // No weight for digital product
            length: 0,
            breadth: 0,
            height: 0,
            shipping_required: false // No shipping for PDF
        },
        "print": {
            name: "Jeevan Margadarshana - Printed Book",
            sku: "JM_BOOK_001", 
            hsn: 490110, // HSN code for printed books
            weight: 0.5, // 500 grams
            length: 25, // 25 cm
            breadth: 20, // 20 cm
            height: 3, // 3 cm
            shipping_required: true // Requires physical shipping
        }
    },

    // Default shipping preferences
    defaultSettings: {
        payment_method: "Prepaid", // Since you're taking payment first
        sub_total_includes_tax: true,
        billing_is_shipping: true, // Usually customer address is same for both
        courier_partner: "auto", // Let Shiprocket choose best courier
        delivery_type: "standard" // standard/express
    }
};

module.exports = SHIPROCKET_CONFIG;