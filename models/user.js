const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  name: String,
  email: String,
  password: String,
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
});

module.exports = mongoose.model("User", userSchema);
