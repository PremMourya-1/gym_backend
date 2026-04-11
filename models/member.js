const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    id: { type: String, default: uuidv4, unique: true },

    name: { type: String, required: true },
    phone: { type: String, required: true },

    joinDate: { type: Date, default: Date.now },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Member", memberSchema);
