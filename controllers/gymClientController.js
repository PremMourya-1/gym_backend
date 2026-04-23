const gymClient = require("../models/gymClients");
const gymPlan = require("../models/gymPlan");
const renewal = require("../models/renewal");
const Renewal = require("../models/renewal");
const { default: toCamelCase } = require("../utils/toCamelCase");

exports.getGymClient = async (req, res) => {
  try {
    let {
      limit = 10,
      page = 1,
      gender,
      isExpired,
      isPending,
      isDeactive,
      search,
    } = req.query;

    limit = parseInt(limit);
    page = parseInt(page);
    const skip = (page - 1) * limit;

    const gymId = req.user.id;
    const today = new Date();

    // 👇 initial DB filter
    let filter = {
      "gym.id": gymId,
    };

    if (gender) {
      filter.gender = gender;
    }

    // 👇 fetch clients + plans
    const [clients, plans] = await Promise.all([
      gymClient.find(filter).sort({ createdAt: -1 }),
      gymPlan.find({ "gym.id": gymId }),
    ]);

    // 👇 plan map
    const planMap = {};
    plans.forEach((p) => {
      planMap[p.id] = {
        duration: p.duration,
        name: p.name,
      };
    });

    // 👇 process clients
    let processed = clients.map((c) => {
      const baseDate = c.lastRenewalDate
        ? new Date(c.lastRenewalDate)
        : new Date(c.joiningDate);

      const duration = planMap[c.planId]?.duration || 0;

      const expiryDate = new Date(baseDate);
      expiryDate.setMonth(expiryDate.getMonth() + duration);

      const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      return {
        ...c._doc,
        plan: {
          ...c.plan,
          name: planMap[c.plan?.id]?.name || null,
        },
        expiryDate,
        expired: diffDays,
        isActive: c.active,

        // 🔥 directly from DB now
        totalPendingAmount: Number(c.totalPendingAmount || 0),
      };
    });

    // 🔍 search
    if (search) {
      processed = processed.filter(
        (c) =>
          c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
          c.mobileNo.includes(search),
      );
    }

    // 🎯 filters
    if (isDeactive == 1) {
      processed = processed.filter((c) => c.isActive === false);
    } else if (isExpired == 1) {
      processed = processed.filter((c) => c.isActive === true && c.expired < 0);
    } else if (isPending == 1) {
      processed = processed.filter(
        (c) => c.isActive === true && Number(c.pendingAmount) > 0,
      );
    }

    const totalCount = processed.length;

    const data = processed.slice(skip, skip + limit);

    return res.status(200).json({
      action: true,
      message: "gym client list fetched",
      data: {
        data,
        totalCount,
      },
    });
  } catch (e) {
    return res.status(200).json({
      action: false,
      message: "Error fetching gym client data",
      error: e.message,
    });
  }
};

exports.createGymClient = async (req, res) => {
  try {
    const payload = req.body;
    const { id, ownerName, gymName } = req.user;

    // ============================
    // ✅🔥 NEW: DUPLICATE CHECK
    // ============================
    const existingClient = await gymClient.findOne({
      mobileNo: payload.mobileNo,
      "gym.id": id,
    });

    if (existingClient) {
      return res.status(200).json({
        action: false,
        message: `Client already exists with this mobile number (${toCamelCase(existingClient.clientName)})`,
      });
    }
    // ============================

    const planData = await gymPlan.findOne({ id: payload.planId });

    // 🔥 expiry calculate
    const joiningDate = new Date(payload.joiningDate);
    const expiryDate = new Date(joiningDate);
    expiryDate.setMonth(expiryDate.getMonth() + (planData.duration || 1));

    // 🔥 expired (days diff)
    const today = new Date();
    const diffTime = expiryDate - today;
    const expired = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const data = await gymClient.create({
      ...payload,
      photo: req.file ? req.file.filename : null,
      gym: { id, ownerName, gymName },
      totalPendingAmount: payload.pendingAmount,
      plan: {
        id: planData.id,
        amount: planData.price,
        name: planData.name,
        duration: planData.duration,
      },

      joiningDate,
      expiryDate,
    });

    // 🔥 first renewal entry
    await Renewal.create({
      clientId: data.id,

      client: {
        clientName: data.clientName,
        mobileNo: data.mobileNo,
      },

      planId: planData.id,
      plan: {
        id: planData.id,
        name: planData.name,
        amount: planData.price,
        duration: planData.duration,
      },

      renewalDate: joiningDate,
      joiningDate: joiningDate,
      expiryDate: expiryDate,

      paidAmount: payload.paidAmount,
      pendingAmount: payload.pendingAmount,
      discountAmount: payload.discountAmount,
    });

    const responseData = {
      ...data.toObject(),
      expired,
    };

    res.status(200).json({
      action: true,
      message: "gym client created successfully",
      data: responseData,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error creating gym client",
      error: e.message,
    });
  }
};

exports.updateGymClient = async (req, res) => {
  try {
    const id = req.params.id;
    let payload = req.body;

    // 🔥 STEP 1: purana data nikaal
    const oldData = await gymClient.findOne({ id });

    // 🔥 STEP 2: agar new photo aayi hai
    if (req.file) {
      payload.photo = `/uploads/${req.file.filename}`;

      // 🔥 STEP 3: old photo delete karo
      if (oldData?.photo) {
        fs.unlink("." + oldData.photo, (err) => {
          if (err) console.log("Old photo delete error:", err);
        });
      }
    }

    // 🔥 STEP 4: update data
    const data = await gymClient.findOneAndUpdate({ id }, payload, {
      new: true,
    });

    res.status(200).json({
      action: true,
      message: "gym client updated successfully",
      data,
    });
  } catch (e) {
    res.status(500).json({
      action: false,
      message: "Error updating gym client",
      error: e.message,
    });
  }
};

exports.deleteGymClient = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await gymClient.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(200).json({
        action: false,
        message: "gym client not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "gym client deleted successfully",
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error deleting gym client",
      error: e.message,
    });
  }
};

exports.updateClientPhoto = async (req, res) => {
  try {
    const id = req.params.id;

    // file check
    if (!req.file) {
      return res.status(200).json({
        action: false,
        message: "Photo is required",
      });
    }

    const client = await gymClient.findOne({ id });

    if (!client) {
      return res.status(200).json({
        action: false,
        message: "Client not found",
      });
    }

    // 🔄 update photo
    client.photo = req.file.filename;

    await client.save();

    res.status(200).json({
      action: true,
      message: "Photo updated successfully",
      data: client,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error updating photo",
      error: e.message,
    });
  }
};
