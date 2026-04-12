const gymClients = require("../models/gymClients");
const GymClient = require("../models/gymClients");
const Renewal = require("../models/renewal");

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
    } = req.body;

    // 1. client fetch
    const client = await GymClient.findOne({ id: clientId });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // 2. startDate logic
    const today = new Date(renewalDate || new Date());

    const startDate =
      new Date(client.expiryDate) > today ? new Date(client.expiryDate) : today;

    // 3. duration nikalna (plan se ya client se)
    const duration = Number(client.plan?.duration || 1);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);

    // 4. Renewal entry create (history)
    await Renewal.create({
      clientId: client.id,
      client: {
        clientName: client.clientName,
        mobileNo: client.mobileNo,
      },

      planId: planId,
      plan: {
        id: planId,
        name: client.plan?.name,
        amount: planAmount,
        duration: client.plan?.duration,
      },

      renewalDate: today,
      joiningDate: startDate,
      expiryDate: endDate,

      paidAmount,
      pendingAmount,
      discountAmount,
    });

    // 5. GymClient update (current state)
    client.planId = planId;
    client.plan = {
      ...client.plan,
      id: planId,
      amount: planAmount,
    };

    client.lastRenewalDate = today;
    client.expiryDate = endDate;

    client.paidAmount = Number(paidAmount || 0);
    client.pendingAmount = Number(pendingAmount || 0);
    client.discountAmount = Number(discountAmount || 0);
    client.totalPendingAmount = client.totalPendingAmount + pendingAmount;

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
    console.log(client);
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
    };

    // 🔥 renewal list (clean)
    const renewalList = renewals.map((r) => ({
      renewalDate: r.renewalDate,
      plan: r.plan,
      paidAmount: r.paidAmount,
      pendingAmount: r.pendingAmount,
      discountAmount: r.discountAmount,
      expiryDate: r.expiryDate,
    }));

    // 🔥 totals calculate
    let totalPending = 0;
    let totalPaid = 0;
    let totalDiscount = 0;

    let totalPendingReceived = 0;
    let totalDiscountOnPending = 0;

    renewals.forEach((r) => {
      totalPending += Number(r.pendingAmount || 0);
      totalPaid += Number(r.paidAmount || 0);
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
          totalPaid,
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

    if (markAsDiscount) {
      client.pendingAmount = 0;
    } else {
      client.pendingAmount = client.pendingAmount - payAmount;
    }

    client.paidAmount = Number(client.paidAmount || 0) + payAmount;
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
