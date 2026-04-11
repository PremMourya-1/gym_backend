const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/db");

const authController = require("./controllers/authController");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS (production ready)
app.use(
  cors({
    origin: ["http://localhost:5173", "https://gym.softwayx.in"],
    credentials: true,
  }),
);

/**
 * =========================
 * AUTH ROUTES (CLEAN API)
 * =========================
 */
app.post("/api/login", authController.userLogin);
app.post("/api/admin/login", authController.adminLogin);
app.post("/api/register", authController.register);

app.get("/api/logout", authController.logout);
app.get("/api/admin/logout", authController.logout);

/**
 * =========================
 * ROUTES MODULES
 * =========================
 */
app.use("/api/admin", adminRoutes);
app.use("/api", userRoutes);

/**
 * =========================
 * STATIC FILES
 * =========================
 */
app.use("/uploads", express.static("uploads"));

/**
 * =========================
 * START SERVER
 * =========================
 */
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.log("DB Connection Error:", err);
  }
};

startServer();
