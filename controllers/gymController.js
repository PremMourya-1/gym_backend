const Gym = require("../models/gym");
const bcrypt = require("bcryptjs");
const plan = require("../models/plan");

// ✅ GET ALL
exports.getGym = async (req, res) => {
  try {
    const data = await Gym.find();

    res.status(200).json({
      action: true,
      message: "gym list fetched",
      data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error fetching gym data",
      error: e.message,
    });
  }
};

// ✅ CREATE
exports.createGym = async (req, res) => {
  try {
    const payload = req.body;

    const hash = await bcrypt.hash(payload.password, 10);
    const planData = await plan.findOne({ id: payload.planId });

    const data = await Gym.create({
      ...payload,
      password: hash,
      planData: {
        id: planData.id,
        name: planData.name,
        duration: planData.duration,
        amount: planData.amount,
      },
    });

    res.status(200).json({
      action: true,
      message: "gym created successfully",
      data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error creating gym",
      error: e.message,
    });
  }
};

// ✅ UPDATE
exports.updateGym = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;

    // 🔐 agar password aa raha hai to hash karo
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const data = await Gym.findOneAndUpdate({ id }, payload, {
      new: true,
    });

    if (!data) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "gym updated successfully",
      data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error updating gym",
      error: e.message,
    });
  }
};

// ✅ DELETE
exports.deleteGym = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await Gym.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(200).json({
        action: false,
        message: "gym not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "gym deleted successfully",
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error deleting gym",
      error: e.message,
    });
  }
};

// ✅ CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    console.log(req.user);
    const gymId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // ✅ validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(200).json({
        action: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(200).json({
        action: false,
        message: "New password and confirm password must match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(200).json({
        action: false,
        message: "Password must be at least 6 characters",
      });
    }

    const gymData = await Gym.findOne({ id: gymId });

    if (!gymData) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, gymData.password);

    if (!isMatch) {
      return res.status(200).json({
        action: false,
        message: "Old password is incorrect",
      });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    gymData.password = hash;

    await gymData.save();

    res.json({
      action: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.log(err); // 👈 important (check actual error)
    res.status(200).json({
      action: false,
      message: "Server error",
      error: err.message,
    });
  }
};
