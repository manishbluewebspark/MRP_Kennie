import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js"
import usersRoutes from "./routes/user.routes.js"
import roleRoutes from "./routes/role.routes.js"
import libraryRoutes from "./routes/library.routes.js"
import customerRoutes from "./routes/customer.routes.js"
import projectRoutes from "./routes/Project.routes.js"
import drawingRoutes from "./routes/drawing.routes.js"
import quotesRoutes from "./routes/quote.routes.js"
import skillLevelCostingRoutes from "./routes/skilllevelcosting.routes.js"
import markupParameterRoutes from "./routes/markupParameters.routes.js"
import systemSettingsRoutes from "./routes/systemSettings.routes.js"
import workOrdersRoutes from "./routes/workOrder.routes.js"
import suppliersRoutes from "./routes/supplier.routes.js"
import currencyRoutes from "./routes/currency.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import uomRoutes from "./routes/uom.routes.js";
import purchaseSettingsRoutes from './routes/purchaseSettings.routes.js'
import purchaseOrdersRoutes from './routes/purchaseOrder.routes.js'
import receiveMaterialRoutes from './routes/receiveMaterial.routes.js'
import inventoryRoutes from './routes/inventory.routes.js'
import mpnTrackerRoutes from './routes/mpnTracker.routes.js'
import path from "path";
import crypto from 'crypto'
import axios from 'axios'
dotenv.config(); // load .env

const app = express();

// ===== Middlewares =====
const __dirname = path.resolve(); // if using ES modules
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*", // React app ka URL
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
connectDB();

// ===== Routes =====
app.get("/", (req, res) => {
  res.send("🚀 Server is running successfully with middlewares!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/drawings", drawingRoutes);
app.use("/api/quotes", quotesRoutes);
app.use("/api/skill-level-costings", skillLevelCostingRoutes);
app.use("/api/markup-parameter", markupParameterRoutes);
app.use("/api/system-settings", systemSettingsRoutes);
app.use("/api/work-orders", workOrdersRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/currencies", currencyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/uoms", uomRoutes);
app.use("/api/purchase-settings", purchaseSettingsRoutes);
app.use("/api/purchase-orders", purchaseOrdersRoutes);
app.use("/api/receive-material", receiveMaterialRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/mpn-tracker", mpnTrackerRoutes);
// PhonePe Configuration


// const PHONEPE_CONFIG = {
//   baseUrl: 'https://api.phonepe.com/apis/pg',
//   authUrl: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
//   merchantId: 'M23QCAX7M7MKO',
//   saltKey: '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399',
//   saltIndex: 1,
//   clientId: 'SU2511251950208355481486',
//   clientSecret: 'e7553bf6-8b12-4491-a9de-58f82248284f'
// };

// // In-memory token storage (use Redis in production)
// let accessTokens = new Map();

// // Generate signature for PhonePe
// const generateSignature = (payload, endpoint) => {
//   const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
//   const stringToHash = base64Payload + endpoint + PHONEPE_CONFIG.saltKey;

//   const hash = crypto
//     .createHash("sha256")
//     .update(stringToHash)
//     .digest("hex");

//   return hash + "###" + PHONEPE_CONFIG.saltIndex;
// };


// // Authentication Middleware
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({
//       success: false,
//       code: 'UNAUTHORIZED',
//       message: 'Access token required'
//     });
//   }

//   // Check if token exists and is valid
//   if (!accessTokens.has(token)) {
//     return res.status(401).json({
//       success: false,
//       code: 'INVALID_TOKEN',
//       message: 'Invalid or expired token'
//     });
//   }

//   next();
// };

// // Step 1: Authentication Endpoint
// app.post("/api/auth", async (req, res) => {
//   try {
//     const { clientId, clientSecret } = req.body;

//     // Encode clientId:clientSecret for Basic Auth
//     const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

//     let data = {
//       'client_id': 'SU2511251950208355481486',
//       'client_version': '1',
//       'client_secret': 'e7553bf6-8b12-4491-a9de-58f82248284f',
//       'grant_type': 'client_credentials'
//     };

//     const response = await axios.post(
//       "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
//       data,
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//           "Authorization": `Basic ${basicAuth}`,
//           "X-CLIENT-ID": clientId
//         }
//       }
//     );

//     res.json({
//       success: true,
//       data: response.data,
//       message: "PhonePe Authentication Successful"
//     });

//   } catch (error) {
//     console.log("AUTH ERROR:", error.response?.data || error.message);

//     res.status(error.response?.status || 500).json({
//       success: false,
//       message: "PhonePe Authentication Failed",
//       error: error.response?.data || error.message
//     });
//   }
// });


// // Step 2: Create Payment Endpoint (Protected)
// app.post('/api/create-payment', async (req, res) => {
//   try {
//     const paymentData = req.body;

// const payload = {
//   merchantOrderId: paymentData?.merchantOrderId || paymentData?.customer?.id,
//   amount: paymentData?.amount,
//   expireAfter: 1200,

//   metaInfo: {
//     udf1: `Customer: ${paymentData?.customer?.name || 'Naveen'}`,
//     udf2: `Email: ${paymentData?.customer?.email}`,
//     udf3: `Mobile: ${paymentData?.customer?.mobile}`,
//     udf4: `Product: ${paymentData?.productName || 'Product'}`,
//     udf5: `Notes: ${paymentData?.notes || ''}`,
//     udf6: "Payment via PhonePe",
//     udf11: "WEB",
//     udf12: "ONLINE"
//   },

//   paymentFlow: {
//     type: "PG_CHECKOUT",
//     message: `Payment for ${paymentData?.productName || "Product"}`,
//     merchantUrls: {
//       redirectUrl: "https://www.softwaresetu.com/payment-success",
//       callbackUrl: "https://www.softwaresetu.com/api/webhook"
//     }
//   },

//   paymentMethods: ["UPI", "CARD", "NETBANKING", "WALLET"]
// };



//     // ❗ Correct endpoint for signature
//     const endpoint = "/pg/checkout/v2/pay";
//     const signature = generateSignature(payload, endpoint);

//     const response = await axios.post(
//       "https://api.phonepe.com/apis/pg/checkout/v2/pay",
//       payload,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `O-Bearer ${paymentData?.tokk}`,   // No O-Bearer
//           "X-VERIFY": signature,
//           "X-MERCHANT-ID": "M23QCAX7M7MKO"
//         }
//       }
//     );

//     res.json({
//       success: true,
//       data: response.data,
//       message: "Payment initiated successfully"
//     });

//   } catch (error) {
//     console.error("Payment error:", error);

//     res.status(error.response?.status || 500).json({
//       success: false,
//       message: error.response?.data?.message || "Payment initiation failed",
//       error: error.response?.data
//     });
//   }
// });


// // Webhook endpoint for PhonePe callbacks
// app.post('/api/webhook', (req, res) => {
//   console.log('📩 Webhook received:', req.body);
//   res.status(200).json({ status: 'OK' });
// });

// // Check payment status
// app.post('/api/check-payment-status', authenticateToken, async (req, res) => {
//   try {
//     const { merchantTransactionId } = req.body;

//     const endpoint = `/pg/v1/status/${PHONEPE_CONFIG.merchantId}/${merchantTransactionId}`;
//     const signature = generateSignature({}, endpoint);

//     const response = await axios.get(
//       `${PHONEPE_CONFIG.baseUrl}${endpoint}`,
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           'X-VERIFY': signature,
//           'X-MERCHANT-ID': PHONEPE_CONFIG.merchantId
//         }
//       }
//     );

//     res.json({
//       success: true,
//       data: response.data.data
//     });

//   } catch (error) {
//     console.error('Status check error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Status check failed'
//     });
//   }
// });

// // Token cleanup (remove expired tokens)
// setInterval(() => {
//   const now = Date.now();
//   for (let [token, data] of accessTokens.entries()) {
//     if (data.expiresAt < now) {
//       accessTokens.delete(token);
//     }
//   }
// }, 60 * 60 * 1000); // Run every hour



app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT} (${process.env.NODE_ENV || "local"})`);
});
