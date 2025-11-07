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
import path from "path";
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
