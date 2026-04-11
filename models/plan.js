const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const planSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // months
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    features: [
      {
        type: String,
      },
    ],
    maxClients: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
