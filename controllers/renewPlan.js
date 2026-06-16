const gymClients = require("../models/gymClients");
const GymClient = require("../models/gymClients");
const Renewal = require("../models/renewal");
const gymPlan = require("../models/gymPlan");
const {
  getApplicableOffer,
  calculateExpiryDate,
} = require("../utils/offerExpiry");

const createRenewal = async (req, res) => {
  try {
    const {
      clientId,
      planId,
      planAmount,
      paidAmount,
      pendingAmount,
      discountAmount,
      renewalDate,
      withOffer,
    } = req.body;

    // 1. client fetch
    const client = await GymClient.findOne({ id: clientId });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // 2. startDate logic
    const today = new Date(renewalDate || new Date());

    const planData = await gymPlan.findOne({
      id: planId,
      "gym.id": client.gym.id,
    });

    if (!planData) {
      return res.status(200).json({
        action: false,
        message: "Invalid planId",
      });
    }

    const startDate =
      new Date(client.expiryDate) > today ? new Date(client.expiryDate) : today;

    const applyOffer = Number(withOffer) === 1;
    const offer = applyOffer
      ? await getApplicableOffer({
          gymId: client.gym.id,
          planId,
          referenceDate: startDate,
        })
      : null;

    const endDate = calculateExpiryDate({
      startDate,
      durationMonths: planData.duration || 1,
      bonusDays: offer?.days || 0,
    });

    // 4. Renewal entry create (history)
    await Renewal.create({
      clientId: client.id,
      client: {
        clientName: client.clientName,
        mobileNo: client.mobileNo,
      },

      planId: planId,
      plan: {
        id: planData.id,
        name: planData.name,
        amount: planData.price,
        duration: planData.duration,
      },
      offer: offer
        ? {
            id: offer.id,
            name: offer.offerName,
            days: offer.days,
            offerStartDate: offer.offerStartDate,
            offerEndDate: offer.offerEndDate,
          }
        : undefined,

      renewalDate: today,
      joiningDate: startDate,
      expiryDate: endDate,
      paidAmount,
      totalCollectedAmount: paidAmount,
      pendingAmount,
      discountAmount,
    });

    // 5. GymClient update (current state)
    client.planId = planId;
    client.plan = {
      id: planData.id,
      amount: planData.price,
      name: planData.name,
      duration: planData.duration,
    };

    client.offer = offer
      ? {
          id: offer.id,
          name: offer.offerName,
          days: offer.days,
          offerStartDate: offer.offerStartDate,
          offerEndDate: offer.offerEndDate,
        }
      : undefined;

    client.lastRenewalDate = today;
    client.expiryDate = endDate;

    client.paidAmount = Number(paidAmount || 0);
    client.pendingAmount = Number(pendingAmount || 0);
    client.discountAmount = Number(discountAmount || 0);
    client.totalPendingAmount =
      Number(client.totalPendingAmount) + Number(pendingAmount || 0);

    await client.save();

    return res.status(200).json({
      action: true,
      message: "Renewal successful",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};

const getClientRenewals = async (req, res) => {
  try {
    const { clientId } = req.params;

    const renewals = await Renewal.find({ clientId }).sort({ renewalDate: -1 });
    const client = await gymClients.findOne({ id: clientId });
    if (!renewals.length) {
      return res.status(404).json({
        action: false,
        message: "No renewal data found",
      });
    }

    // 🔥 client info (first record se)

    const clientInfo = {
      clientId: client.id,
      clientName: client.clientName,
      mobileNo: client.mobileNo,
      joiningDate: client.joiningDate,
      photo: client.photo,
    };

    // 🔥 renewal list (clean)
    const renewalList = renewals.map((r) => ({
      renewalDate: r.renewalDate,
      plan: r.plan,
      paidAmount: r.paidAmount,
      pendingAmount: r.pendingAmount,
      discountAmount: r.discountAmount,
      expiryDate: r.expiryDate,
      expired: Math.ceil(
        (new Date(r.expiryDate) - new Date()) / (1000 * 60 * 60 * 24),
      ),
    }));

    // 🔥 totals calculate
    let totalPending = 0;
    let totalCollectedAmount = 0;
    let totalDiscount = 0;

    let totalPendingReceived = 0;
    let totalDiscountOnPending = 0;

    renewals.forEach((r) => {
      totalPending += Number(r.pendingAmount || 0);
      totalCollectedAmount += Number(r.totalCollectedAmount || 0);
      totalDiscount += Number(r.discountAmount || 0);

      totalPendingReceived += Number(r.totalPendingReceived || 0);
      totalDiscountOnPending += Number(r.discountOnPending || 0);
    });

    return res.status(200).json({
      action: true,
      message: "Renewal list fetched successfully",
      data: {
        client: clientInfo,
        renewals: renewalList,

        // 🔥 NEW
        summary: {
          totalPending,
          totalCollectedAmount,
          totalDiscount,
          totalPendingReceived,
          totalDiscountOnPending,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      action: false,
      message: "Something went wrong",
    });
  }
};

receivePending = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { amount, markAsDiscount } = req.body;

    const payAmount = Number(amount || 0);

    if (!clientId || payAmount <= 0) {
      return res.status(200).json({
        action: false,
        message: "Invalid data",
      });
    }

    // 🔥 fetch client
    const client = await gymClients.findOne({ id: clientId });

    if (!client) {
      return res.status(404).json({
        action: false,
        message: "Client not found",
      });
    }

    // 🔥 latest renewal
    const renewal = await Renewal.findOne({ clientId }).sort({
      renewalDate: -1,
    });

    if (!renewal) {
      return res.status(404).json({
        action: false,
        message: "Renewal not found",
      });
    }

    const oldPending = Number(client.totalPendingAmount || 0);

    if (payAmount > oldPending) {
      return res.status(200).json({
        action: false,
        message: "Amount exceeds pending",
      });
    }

    // 🔥 remaining (single source of truth)
    let remaining = oldPending - payAmount;

    // =========================
    // 🔥 RENEWAL UPDATE
    // =========================

    renewal.totalPendingReceived =
      Number(renewal.totalPendingReceived || 0) + payAmount;
    renewal.totalCollectedAmount =
      Number(renewal.totalCollectedAmount || 0) + payAmount;

    if (markAsDiscount) {
      renewal.discountOnPending =
        Number(renewal.discountOnPending || 0) + remaining;

      remaining = 0;
    }

    // renewal.pendingAmount = remaining;

    await renewal.save();

    // =========================
    // 🔥 CLIENT UPDATE (ONLY CURRENT STATE)
    // =========================

    const totalReceivedWithDiscountTillToday =
      Number(client.discountAmount) + Number(client.paidAmount);

    const howMuchNeeded =
      Number(client.plan?.amount) - totalReceivedWithDiscountTillToday;

    const isUserPayingExtra = howMuchNeeded - payAmount < 0; // -150
    // const isUserPayingExtra = howMuchExtra < 0; // false
    let howMuchExtra = isUserPayingExtra ? howMuchNeeded - payAmount : 0;

    const updateOnlyWithThisAmount = payAmount - howMuchExtra;

    if (markAsDiscount) {
      client.pendingAmount = 0;
    } else {
      if (isUserPayingExtra) {
      }
      client.pendingAmount =
        Number(client.pendingAmount) - updateOnlyWithThisAmount;
    }
    if (updateOnlyWithThisAmount > 0) {
      client.paidAmount = updateOnlyWithThisAmount + Number(client.paidAmount);
    }

    client.totalPendingAmount = remaining;

    await client.save();

    return res.status(200).json({
      action: true,
      message: "Pending updated successfully",
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      action: false,
      message: "Something went wrong",
    });
  }
};
module.exports = { createRenewal, getClientRenewals, receivePending };
