const Offer = require("../models/offer");
const gymClient = require("../models/gymClients");
const gymPlan = require("../models/gymPlan");

const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ "gym.id": req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const formattedOffers = await Promise.all(
      offers.map(async ({ gym, ...rest }) => {
        const activeClientsCount = await gymClient.countDocuments({
          "offer.id": rest.id,
          active: true,
          "offer.offerStartDate": { $lte: now },
          "offer.offerEndDate": { $gte: now },
        });

        return {
          ...rest,
          activeClientsCount,
        };
      }),
    );

    return res.status(200).json({
      action: true,
      message: "offer list fetched",
      data: formattedOffers,
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error fetching offer list",
      error: error.message,
    });
  }
};

const createOffer = async (req, res) => {
  try {
    const { id, ownerName, gymName } = req.user;
    const { offerName, planId, days, offerStartDate, offerEndDate } = req.body;

    if (
      !offerName ||
      !planId ||
      days === undefined ||
      !offerStartDate ||
      !offerEndDate
    ) {
      return res.status(200).json({
        action: false,
        message:
          "offerName, planId, days, offerStartDate and offerEndDate are required",
      });
    }

    const planData = await gymPlan.findOne({ id: planId, "gym.id": id });
    if (!planData) {
      return res.status(200).json({
        action: false,
        message: "Invalid planId",
      });
    }

    const startDate = new Date(offerStartDate);
    const endDate = new Date(offerEndDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(200).json({
        action: false,
        message: "Invalid offer dates",
      });
    }

    if (endDate < startDate) {
      return res.status(200).json({
        action: false,
        message: "offerEndDate must be greater than or equal to offerStartDate",
      });
    }

    const data = await Offer.create({
      offerName,
      planId,
      plan: {
        id: planData.id,
        name: planData.name,
        price: planData.price,
      },
      days: Number(days || 0),
      offerStartDate: startDate,
      offerEndDate: endDate,
      gym: { id, ownerName, gymName },
    });

    return res.status(200).json({
      action: true,
      message: "offer created successfully",
      data,
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error creating offer",
      error: error.message,
    });
  }
};

const updateOffer = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = { ...req.body };

    if (payload.offerStartDate) {
      payload.offerStartDate = new Date(payload.offerStartDate);
    }

    if (payload.offerEndDate) {
      payload.offerEndDate = new Date(payload.offerEndDate);
    }

    if (
      payload.offerStartDate &&
      payload.offerEndDate &&
      payload.offerEndDate < payload.offerStartDate
    ) {
      return res.status(200).json({
        action: false,
        message: "offerEndDate must be greater than or equal to offerStartDate",
      });
    }

    if (payload.planId) {
      const planData = await gymPlan.findOne({
        id: payload.planId,
        "gym.id": req.user.id,
      });

      if (!planData) {
        return res.status(200).json({
          action: false,
          message: "Invalid planId",
        });
      }

      payload.plan = {
        id: planData.id,
        name: planData.name,
        price: planData.price,
      };
    }

    if (payload.days !== undefined) {
      payload.days = Number(payload.days || 0);
    }

    const data = await Offer.findOneAndUpdate(
      { id, "gym.id": req.user.id },
      payload,
      { new: true },
    );

    if (!data) {
      return res.status(200).json({
        action: false,
        message: "offer not found",
      });
    }

    return res.status(200).json({
      action: true,
      message: "offer updated successfully",
      data,
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error updating offer",
      error: error.message,
    });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const id = req.params.id;

    const offer = await Offer.findOne({ id, "gym.id": req.user.id });
    if (!offer) {
      return res.status(200).json({
        action: false,
        message: "offer not found",
      });
    }

    const registeredClient = await gymClient.findOne({
      "gym.id": req.user.id,
      "offer.id": offer.id,
      joiningDate: { $gte: offer.offerStartDate, $lte: offer.offerEndDate },
    });

    if (registeredClient) {
      return res.status(200).json({
        action: false,
        message:
          "Offer cannot be deleted because a client is registered during the offer period",
      });
    }

    const result = await Offer.deleteOne({ id, "gym.id": req.user.id });

    if (result.deletedCount === 0) {
      return res.status(200).json({
        action: false,
        message: "offer not found",
      });
    }

    return res.status(200).json({
      action: true,
      message: "offer deleted successfully",
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error deleting offer",
      error: error.message,
    });
  }
};

module.exports = {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
};
