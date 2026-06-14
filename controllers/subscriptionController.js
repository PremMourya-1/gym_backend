const crypto = require("crypto");
const Gym = require("../models/gym");
const Plan = require("../models/plan");
const SubscriptionHistory = require("../models/subscriptionHistory");
const razorpay = require("../config/razorpay");
const {
  getSubscriptionDetails,
  buildNotification,
} = require("../utils/getSubscriptionDetails");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const getOrCreateRazorpayOrder = async (payload) => {
  const { amountInPaise, currency = "INR", receipt, notes = {} } = payload;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are not configured");
  }

  if (
    !amountInPaise ||
    typeof amountInPaise !== "number" ||
    amountInPaise < 100
  ) {
    throw new Error("Amount must be at least 100 paise");
  }

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency,
    receipt,
    notes,
  });

  return {
    ...order,
    provider: "razorpay",
    isMock: false,
  };
};

const activatePlanForGym = async ({
  gymData,
  planData,
  action = "activated",
  paymentDetails = {},
}) => {
  const now = new Date();

  const previousPlan = gymData.planData || {};

  const currentEndDate = gymData.planEndDate
    ? new Date(gymData.planEndDate)
    : null;

  const startFrom =
    currentEndDate && currentEndDate > now ? currentEndDate : now;

  const newEndDate = new Date(startFrom);

  newEndDate.setMonth(newEndDate.getMonth() + Number(planData.duration || 0));

  // Update Gym
  gymData.planId = planData.id;

  gymData.planData = {
    id: planData.id,
    name: planData.name,
    duration: Number(planData.duration || 0),
    amount: Number(planData.amount || 0),
  };

  gymData.planEndDate = newEndDate;

  await gymData.save();

  // SINGLE SOURCE OF TRUTH
  await SubscriptionHistory.create({
    gymId: gymData.id,

    gym: {
      id: gymData.id,
      gymName: gymData.gymName,
      ownerName: gymData.ownerName,
      email: gymData.email,
      phone: gymData.phone,
      username: gymData.username,
    },

    planId: planData.id,

    plan: {
      id: planData.id,
      name: planData.name,
      duration: Number(planData.duration || 0),
      amount: Number(planData.amount || 0),
    },

    previousPlan: {
      id: previousPlan.id,
      name: previousPlan.name,
      duration: Number(previousPlan.duration || 0),
      amount: Number(previousPlan.amount || 0),
    },

    // Payment Details
    orderId: paymentDetails.orderId || null,

    paymentId: paymentDetails.paymentId || null,

    signature: paymentDetails.signature || null,

    paymentStatus: paymentDetails.paymentStatus || "paid",

    paymentProvider: paymentDetails.provider || "razorpay",

    // Dates
    renewalDate: now,

    expiryDate: newEndDate,

    action,
  });

  return gymData;
};

// simple plan k api
exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ amount: 1 });

    return res.status(200).json({
      action: true,
      message: "subscription plans fetched",
      data: plans,
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error fetching subscription plans",
      error: error.message,
    });
  }
};

//  y kam ka hai , current ki api ka controller y hi h
exports.getCurrentSubscription = async (req, res) => {
  try {
    const gymId = req.user.id;
    const gymData = await Gym.findOne({ id: gymId });

    if (!gymData) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    const subscription = getSubscriptionDetails(gymData);
    const notification = buildNotification(subscription);

    return res.status(200).json({
      action: true,
      message: "current subscription fetched",
      data: {
        planEndDate: gymData.planEndDate,
        planId: gymData.planId,
        planData: gymData.planData,
        status: gymData.status,
        notification,
      },
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error fetching current subscription",
      error: error.message,
    });
  }
};

exports.createSubscriptionOrder = async (req, res) => {
  try {
    const gymId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        action: false,
        message: "Plan is required",
      });
    }

    const gymData = await Gym.findOne({ id: gymId });

    if (!gymData) {
      return res.status(404).json({
        action: false,
        message: "Gym not found",
      });
    }

    const planData = await Plan.findOne({
      id: planId,
      isActive: true,
    });

    if (!planData) {
      return res.status(404).json({
        action: false,
        message: "Plan not found",
      });
    }

    const amount = Number(planData.amount || 0);

    const receipt = `sub_${Date.now()}`;

    const order = await getOrCreateRazorpayOrder({
      amountInPaise: amount * 100,
      currency: "INR",
      receipt,
      notes: {
        gymId,
        planId,
      },
    });

    return res.status(200).json({
      action: true,
      message: "Subscription payment order created",
      data: {
        order,
        razorpayKeyId: RAZORPAY_KEY_ID || null,
      },
    });
  } catch (error) {
    console.error("Subscription create order error:", error);

    return res.status(500).json({
      action: false,
      message: "Error creating subscription order",
      error: error.message,
    });
  }
};

exports.verifySubscriptionPayment = async (req, res) => {
  try {
    const gymId = req.user.id;

    const {
      planId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !planId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        action: false,
        message: "Required payment fields missing",
      });
    }

    const gymData = await Gym.findOne({
      id: gymId,
    });

    if (!gymData) {
      return res.status(404).json({
        action: false,
        message: "Gym not found",
      });
    }

    const planData = await Plan.findOne({
      id: planId,
      isActive: true,
    });

    if (!planData) {
      return res.status(404).json({
        action: false,
        message: "Plan not found",
      });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        action: false,
        message: "Razorpay secret missing",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        action: false,
        message: "Invalid signature",
      });
    }

    // Prevent duplicate payments
    const existingHistory = await SubscriptionHistory.findOne({
      paymentId: razorpay_payment_id,
    });

    if (existingHistory) {
      return res.status(400).json({
        action: false,
        message: "Payment already processed",
      });
    }

    // Activate Plan
    const updatedGym = await activatePlanForGym({
      gymData,
      planData,
      action: "upgraded",

      paymentDetails: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        provider: "razorpay",
        paymentStatus: "paid",
      },
    });

    return res.status(200).json({
      action: true,
      message: "Subscription activated successfully",
    });
  } catch (error) {
    console.error("Subscription verify payment error:", error);

    return res.status(500).json({
      action: false,
      message: "Error verifying subscription payment",
      error: error.message,
    });
  }
};
