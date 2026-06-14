const gymPlan = require("../models/gymPlan");
const gymClient = require("../models/gymClients");

exports.getGymPlan = async (req, res) => {
  try {
    const data = await gymPlan
      .find({ "gym.id": req.user.id, isActive: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      action: true,
      message: "gym plan list fetched",
      data: data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error fetching gym plan data",
      error: e.message,
    });
  }
};

exports.createGymPlan = async (req, res) => {
  try {
    const payload = req.body;
    const { id, ownerName, gymName } = req.user;
    const data = await gymPlan.create({
      ...payload,
      gym: { id, ownerName, gymName },
    });

    res.status(200).json({
      action: true,
      message: "gym plan created successfully",
      data: data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error creating gym plan",
      error: e.message,
    });
  }
};

exports.updateGymPlan = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;

    const data = await gymPlan.findOneAndUpdate({ id }, payload, {
      new: true,
    });

    res.status(200).json({
      action: true,
      message: "gym plan updated successfully",
      data: data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error updating gym plan",
      error: e.message,
    });
  }
};

exports.deleteGymPlan = async (req, res) => {
  try {
    const id = req.params.id;
    const assignedClient = await gymClient.findOne({
      planId: id,
      "gym.id": req.user.id,
    });

    if (assignedClient) {
      return res.status(200).json({
        action: false,
        message:
          "gym plan assigned hai already delete nahi ho skta only update ho skta hai",
      });
    }

    const result = await gymPlan.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(200).json({
        action: false,
        message: "gym plan not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "gym plan deleted successfully",
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error deleting gym plan",
      error: e.message,
    });
  }
};
