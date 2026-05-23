const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const renewalSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },

    clientId: {
      type: String,
      required: true,
    },

    client: {
      clientName: String,
      mobileNo: String,
    },

    planId: {
      type: String,
      required: true,
    },

    plan: {
      id: String,
      name: String,
      amount: String,
      duration: String,
    },
    offer: {
      id: String,
      name: String,
      days: Number,
      offerStartDate: Date,
      offerEndDate: Date,
    },

    renewalDate: {
      type: Date,
      default: Date.now,
    },

    joiningDate: {
      type: Date,
    },

    expiryDate: {
      type: Date,
    },

    paidAmount: {
      type: String,
    },
    totalCollectedAmount: {
      type: String,
    },

    pendingAmount: {
      type: String,
    },

    discountAmount: {
      type: String,
    },
    totalPendingReceived: {
      type: String,
      default: 0,
    },

    discountOnPending: {
      type: String,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Renewal", renewalSchema);
