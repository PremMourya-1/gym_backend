const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/db");

const authController = require("./controllers/authController");
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://6q9zlrx2-5173.inc1.devtunnels.ms/",
    ],
    credentials: true,
  })
);

app.post("/login", authController.userLogin);
app.post("/admin/login", authController.adminLogin);
app.get("/admin/logout", authController.logout);
app.get("/logout", authController.logout);
app.post("/register", authController.register);

app.use("/uploads", require("express").static("uploads"));
app.use("/admin", adminRoutes);
app.use("/", userRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(process.env.PORT, () => {
      console.log("Server running");
    });
  } catch (err) {
    console.log(err);
  }
};

startServer();
