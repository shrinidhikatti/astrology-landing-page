# 🚢 Shiprocket Integration Setup Guide

## Step 1: Create Shiprocket Account

1. **Sign Up**: Go to [shiprocket.in](https://shiprocket.in/)
2. **Business Registration**: Complete your business details
3. **KYC Verification**: Upload required documents
4. **Add Pickup Location**: Your business address for shipping

## Step 2: Get Your Credentials

### From Shiprocket Dashboard:
- **Email**: Your login email
- **Password**: Your login password
- **Pickup Address**: Configure your default pickup location

### Update Environment Variables:

```bash
# Update .env file with your actual Shiprocket credentials
SHIPROCKET_EMAIL=your-actual-email@domain.com
SHIPROCKET_PASSWORD=your-actual-password
```

## Step 3: Configure Pickup Address

Update `shiprocket-config.js` with your business details:

```javascript
pickupLocation: {
    name: "Your Business Name",
    email: "your-business@email.com", 
    phone: "your-phone-number",
    address: "Your complete business address",
    city: "Your City",
    state: "Your State", 
    pin_code: "560001" // Your pincode
}
```

## Step 4: Test Integration

```bash
# Test Shiprocket connection
node test-shiprocket.js
```

Expected output:
```
✅ Shiprocket authentication successful!
✅ Serviceability check successful!
```

## Step 5: How It Works

### For PDF Orders:
- ✅ **Payment Complete** → No shipping needed (digital delivery)
- ✅ **Email sent** with PDF attachment/download link

### For Print Orders:
- ✅ **Payment Complete** → Automatic shipment creation
- ✅ **Shiprocket API** → Assigns courier partner
- ✅ **AWB Number** → Generated for tracking
- ✅ **Customer notification** → Shipping details sent

## API Endpoints Available:

### Create Shipment:
```
POST /api/shipments/create
```

### Track Shipment:
```
GET /api/shipments/track/:awb
```

### Check Serviceability:
```
POST /api/shipments/serviceability
```

## Automatic Workflow:

1. **Customer places order** → Form filled with address
2. **Payment successful** → Order confirmed
3. **If PDF package** → Digital delivery (no shipping)
4. **If Print package** → Automatic shipment creation:
   - Shiprocket creates shipment
   - Courier partner assigned
   - AWB number generated
   - Customer gets tracking details

## Cost Structure:

- **COD Orders**: ₹40-60 per shipment
- **Prepaid Orders**: ₹30-50 per shipment  
- **Weight-based pricing**: 500g book ≈ ₹40-50
- **Volume discounts**: Available for higher volumes

## Testing Process:

1. **Test Environment**: Use your credentials but test with small orders
2. **Verify Pickup**: Ensure pickup address is correct
3. **Test Flow**: Create a print order and verify shipment creation
4. **Check Tracking**: Verify AWB numbers work
5. **Customer Experience**: Test the complete flow

## Important Notes:

- ⚠️ **Prepaid Only**: Since you're taking payment first
- ⚠️ **Pickup Schedule**: Shiprocket needs pickup slots
- ⚠️ **Packaging**: You need to pack the books properly  
- ⚠️ **Inventory**: Ensure you have books in stock
- ⚠️ **Returns**: Configure return policy

## Go Live Checklist:

- [ ] Shiprocket account verified
- [ ] Pickup address configured
- [ ] Test orders successful
- [ ] Packaging materials ready
- [ ] Inventory management planned
- [ ] Customer support process ready

## Support:

- **Shiprocket Support**: support@shiprocket.in
- **API Documentation**: [docs.shiprocket.in](https://docs.shiprocket.in/)
- **Integration Help**: Check server logs in `./data/shiprocket_logs.json`