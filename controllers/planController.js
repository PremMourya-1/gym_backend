const Plan = require("../models/plan");

exports.getPlans = async (req, res) => {
  try {
    const plan = await Plan.find();
    res.status(200).json({
      action: true,
      message: "Plan fetched success",
      data: plan,
    });
  } catch (error) {
    res.status(200).json({
      action: false,
      message: "Error fetching plan",
      error: error.message,
    });
  }
};
exports.createPlan = async (req, res) => {
  try {
    const payload = req.body;
    const plan = await Plan.create(payload);

    res.status(201).json({
      action: true,
      message: "Plan created successfully",
      data: plan,
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: "Error creating plan",
      error: error.message,
    });
  }
};
exports.updatePlan = async (req, res) => {
  try {
    const payload = req.body;
    const id = req.params.id;
    const plan = await Plan.findOneAndUpdate({ id }, payload, { new: true });
    res.status(201).json({
      action: true,
      message: "Plan update successfully",
      data: plan,
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: "Error updating plan",
      error: error.message,
    });
  }
};
exports.deletePlan = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await Plan.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(200).json({
        action: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    res.status(200).json({
      action: false,
      message: "Error deleting plan",
      error: error.message,
    });
  }
};
