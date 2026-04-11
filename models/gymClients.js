const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const gymClientSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNo: {
      type: String,
      required: true,
    },

    planId: {
      type: String,
      required: true,
    },

    joiningDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    lastRenewalDate: {
      type: Date,
    },

    active: {
      type: Boolean,
      default: true,
    },

    gym: {
      id: String,
      ownerName: String,
      gymName: String,
    },
    plan: {
      id: String,
      name: String,
      amount: String,
      duration: String,
    },

    paidAmount: {
      type: String,
    },
    pendingAmount: {
      type: String,
    },
    totalPendingAmount: {
      type: String,
    },

    discountAmount: {
      type: String,
    },
    gender: {
      type: String,
    },
    photo: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GymClient", gymClientSchema);
