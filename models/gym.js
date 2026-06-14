const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const gymSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    gymName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
    authCode: {
      type: String,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    planId: {
      type: String,
      required: true,
    },
    planData: {
      id: String,
      name: String,
      duration: Number,
      amount: Number,
    },

    planEndDate: {
      type: Date,
      required: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
    },
    emailVerificationCodeExpires: {
      type: Date,
    },

    logo: {
      type: String,
    },

    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Gym", gymSchema);
