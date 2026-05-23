const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    gymId: {
      type: String,
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
    },
    plan: {
      id: String,
      name: String,
      duration: Number,
      amount: Number,
    },
    orderId: {
      type: String,
    },
    paymentId: {
      type: String,
    },
    signature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "mock-paid"],
      default: "created",
    },
    provider: {
      type: String,
      default: "razorpay",
    },
    notes: {
      type: Object,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "SubscriptionPayment",
  subscriptionPaymentSchema,
);
