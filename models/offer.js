const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const offerSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    offerName: {
      type: String,
      required: true,
      trim: true,
    },
    planId: {
      type: String,
      required: true,
    },
    plan: {
      id: String,
      name: String,
      price: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    days: {
      type: Number,
      required: true,
      default: 0,
    },
    offerStartDate: {
      type: Date,
      required: true,
    },
    offerEndDate: {
      type: Date,
      required: true,
    },
    gym: {
      id: String,
      ownerName: String,
      gymName: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Offer", offerSchema);
