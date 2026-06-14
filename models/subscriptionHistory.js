const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const subscriptionHistorySchema = new mongoose.Schema(
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

    // Gym Snapshot
    gym: {
      id: String,
      gymName: String,
      ownerName: String,
      email: String,
      phone: String,
      username: String,
    },

    // Current Purchased Plan
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

    // Previous Plan Snapshot
    previousPlan: {
      id: String,
      name: String,
      duration: Number,
      amount: Number,
    },

    // Payment Details
    orderId: {
      type: String,
    },

    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    signature: {
      type: String,
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "failed", "pending"],
      default: "paid",
    },

    paymentProvider: {
      type: String,
      default: "razorpay",
    },

    // Dates
    renewalDate: {
      type: Date,
      default: Date.now,
    },

    // Final calculated expiry date
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "SubscriptionHistory",
  subscriptionHistorySchema,
);
