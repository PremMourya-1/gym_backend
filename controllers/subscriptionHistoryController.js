const SubscriptionHistory = require("../models/subscriptionHistory");

exports.getSubscriptionHistoryByGymId = async (req, res) => {
  try {
    const gymId = req.user.id;
    if (!gymId) {
      return res.status(400).json({
        action: false,
        message: "Gym id is required",
      });
    }

    const history = await SubscriptionHistory.find({ gymId }).sort({
      renewalDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      action: true,
      message: history.length
        ? "Subscription history fetched"
        : "No subscription history found",
      data: history,
    });
  } catch (error) {
    return res.status(500).json({
      action: false,
      message: "Error fetching subscription history",
      error: error.message,
    });
  }
};
