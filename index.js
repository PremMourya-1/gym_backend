const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/db");

const authController = require("./controllers/authController");
const gymController = require("./controllers/gymController");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const sendEmail = require("./utils/sendEmail");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.get("/test-email", async (req, res) => {
  await sendEmail();
  res.send("Email Sent done hai bhai");
});

// CORS (production ready)
app.use(
  cors({
    origin: [
      process.env.frontCorsUrl,
      process.env.frontCorsUrl2,
      process.env.corsForLiveWebsite,
    ],
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.send("server is running on port 3000");
});
app.head("/ping", (req, res) => {
  console.log("ping received");
  res.status(200).end();
});
app.post("/api/login", authController.userLogin);
app.post("/api/admin/login", authController.adminLogin);
app.post("/api/register", authController.register);
app.post("/api/free-register", gymController.freeRegister);

app.post(
  "/api/free-register/send-verification-code",
  gymController.sendVerificationCode,
);
app.post("/api/free-register/verify-email", gymController.verifyEmailOtp);

app.get("/api/logout", authController.logout);
app.get("/api/admin/logout", authController.logout);

/**
 * =========================
 * ROUTES MODULES
 * =========================
 */
// const paymentRoutes = require("./routes/paymentRoutes");

app.use("/api/admin", adminRoutes);
// app.use("/api", paymentRoutes);
app.use("/api", userRoutes);
app.use("/api/contact", contactRoutes);

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
