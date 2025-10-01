# Astrology Landing Page - Complete Backend Solution

A complete Node.js backend solution with Razorpay payments and Shiprocket shipping integration.

## 🚀 Features

- ✅ **Live Razorpay Payments** - Secure payment processing
- ✅ **Shiprocket Integration** - Automated shipping for physical products
- ✅ **Payment Verification** - Webhook-based payment confirmation
- ✅ **Order Management** - Complete order tracking system
- ✅ **Email Notifications** - EmailJS integration maintained
- ✅ **Google Sheets** - Data logging maintained
- ✅ **Security** - Webhook signature verification
- ✅ **Logging** - Comprehensive activity logs

## 📦 Setup Instructions

### 1. Install Dependencies
```bash
cd astrology-landing-page
npm install
```

### 2. Configure Environment Variables
Edit `.env` file with your credentials:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_RHo2WVoEYvKlmV
RAZORPAY_KEY_SECRET=your_secret_key_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Shiprocket Configuration  
SHIPROCKET_EMAIL=your-email@domain.com
SHIPROCKET_PASSWORD=your-shiprocket-password
```

### 3. Start the Server
```bash
# Development
npm run dev

# Production
npm start
```

## 🔑 Required Credentials

### Razorpay Setup:
1. **Login**: [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. **API Keys**: Account & Settings → API Keys
   - Key ID: `rzp_live_RHo2WVoEYvKlmV` ✅ (Already configured)
   - Secret Key: Generate and copy to `.env`
3. **Webhook**: Settings → Webhooks
   - URL: `https://yourdomain.com/api/webhooks/razorpay`
   - Secret: Create your own and add to `.env`
   - Events: `payment.captured`, `payment.failed`, `order.paid`

### Shiprocket Setup:
1. **Sign up**: [Shiprocket.in](https://shiprocket.in/)
2. **API Access**: Get from Settings → API
3. **Credentials**: Add email/password to `.env`

## 🛠 API Endpoints

### Orders
- `POST /api/orders/create` - Create new order
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get specific order

### Webhooks
- `POST /api/webhooks/razorpay` - Razorpay webhook handler
- `GET /api/webhooks/logs` - View webhook logs

### Shipments
- `POST /api/shipments/create` - Create shipment
- `GET /api/shipments/track/:awb` - Track by AWB
- `POST /api/shipments/serviceability` - Check delivery areas

### Tracking
- `GET /api/tracking/order/:orderId` - Track order status
- `GET /api/tracking/summary` - Get business summary

## 🔄 Payment Flow

1. **User submits form** → Frontend calls `/api/orders/create`
2. **Server creates Razorpay order** → Returns order_id
3. **Razorpay payment gateway** → User completes payment
4. **Webhook receives confirmation** → Updates order status
5. **Auto-shipment creation** → For print orders only
6. **Email & Sheets updated** → Existing integrations work

## 📊 Order Management

### Order Statuses:
- `created` - Order created, awaiting payment
- `paid` - Payment successful
- `completed` - Order fulfilled
- `failed` - Payment failed

### Package Types:
- `pdf` - Digital delivery (no shipping)
- `print` - Physical book (auto-shipment)

## 🔒 Security Features

- ✅ **Webhook signature verification**
- ✅ **CORS protection**
- ✅ **Helmet security headers**
- ✅ **Request logging**
- ✅ **Environment variable protection**

## 📁 File Structure

```
astrology-landing-page/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env                   # Environment variables
├── routes/
│   ├── orders.js          # Order management
│   ├── webhooks.js        # Webhook handlers
│   ├── shipments.js       # Shiprocket integration
│   └── tracking.js        # Order tracking
├── data/
│   ├── orders.json        # Orders database
│   ├── payment_logs.json  # Payment logs
│   └── shiprocket_logs.json # Shipping logs
└── index.html             # Frontend (updated)
```

## 🚀 Deployment

### Option 1: Heroku
```bash
# Install Heroku CLI
heroku create astrology-backend
heroku config:set RAZORPAY_KEY_SECRET=your_secret
heroku config:set SHIPROCKET_EMAIL=your_email
git push heroku main
```

### Option 2: DigitalOcean/AWS
- Upload files to server
- Install Node.js 16+
- Run `npm install`
- Use PM2 for process management
- Configure nginx as reverse proxy

## 📞 Support

- **Test endpoint**: `GET /health`
- **Logs location**: `./data/` directory
- **Error logs**: Console output

## ⚡ Quick Start

1. **Get Razorpay secret key** from dashboard
2. **Update `.env`** with your credentials  
3. **Run `npm install && npm start`**
4. **Test with ₹50** payment
5. **Configure webhook** URL in Razorpay
6. **Go live!** 🎉

---

**Ready for production!** This backend handles everything from payments to shipping automatically.