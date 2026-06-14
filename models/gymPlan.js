const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const gymPlanSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
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

module.exports = mongoose.model("GymPlan", gymPlanSchema);
