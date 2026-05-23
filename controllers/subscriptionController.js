const crypto = require("crypto");
const Gym = require("../models/gym");
const Plan = require("../models/plan");
const SubscriptionPayment = require("../models/subscriptionPayment");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const SUBSCRIPTION_PAGE_LINK = "/subscription-plans";

const getSubscriptionDetails = (gymData) => {
  const planStartDate = gymData?.planStartDate
    ? new Date(gymData.planStartDate)
    : null;
  const duration = Number(gymData?.planData?.duration || 0);

  let expiryDate = null;
  let daysRemaining = 0;
  let isExpired = false;

  if (planStartDate && duration > 0) {
    expiryDate = new Date(planStartDate);
    expiryDate.setMonth(expiryDate.getMonth() + duration);

    const now = new Date();
    daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    isExpired = daysRemaining < 0;
  }

  const isFreePlan =
    String(gymData?.planData?.amount || 0) === "0" ||
    String(gymData?.planData?.name || "")
      ?.toLowerCase()
      .includes("free");

  let status = "active";
  if (isExpired) status = "expired";
  else if (isFreePlan) status = "free";
  else if (daysRemaining <= 2) status = "expiring-soon";

  return {
    planStartDate,
    expiryDate,
    daysRemaining,
    status,
    isFreePlan,
    isExpired,
  };
};

const buildNotification = (subscription) => {
  if (subscription.isExpired) {
    return {
      type: "error",
      message: "Your subscription has expired. Renew immediately.",
      actionLabel: "Renew Now",
      actionLink: SUBSCRIPTION_PAGE_LINK,
    };
  }

  if (subscription.status === "expiring-soon") {
    return {
      type: "warning",
      message: `Your subscription plan will expire in ${subscription.daysRemaining} day${
        subscription.daysRemaining === 1 ? "" : "s"
      }. Renew now.`,
      actionLabel: "Renew Now",
      actionLink: SUBSCRIPTION_PAGE_LINK,
    };
  }

  if (subscription.isFreePlan) {
    return {
      type: "info",
      message: "You are currently using Free Plan. Upgrade now.",
      actionLabel: "Upgrade Now",
      actionLink: SUBSCRIPTION_PAGE_LINK,
    };
  }

  return null;
};

const getOrCreateRazorpayOrder = async (payload) => {
  const { amountInPaise, currency = "INR", receipt, notes = {} } = payload;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return {
      id: `order_mock_${Date.now()}`,
      amount: amountInPaise,
      currency,
      receipt,
      notes,
      provider: "mock",
      isMock: true,
    };
  }

  try {
    const Razorpay = require("razorpay");
    const instance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const order = await instance.orders.create({
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
  } catch (error) {
    return {
      id: `order_mock_${Date.now()}`,
      amount: amountInPaise,
      currency,
      receipt,
      notes,
      provider: "mock",
      isMock: true,
      warning: error.message,
    };
  }
};

const activatePlanForGym = async ({ gymData, planData }) => {
  const now = new Date();

  const current = getSubscriptionDetails(gymData);
  const nextPlanStartDate = current.isExpired
    ? now
    : current.expiryDate || gymData.planStartDate || now;

  gymData.planId = planData.id;
  gymData.planData = {
    id: planData.id,
    name: planData.name,
    duration: Number(planData.duration || 0),
    amount: Number(planData.amount || 0),
  };
  gymData.planStartDate = nextPlanStartDate;

  await gymData.save();

  return gymData;
};

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
        planId: gymData.planId,
        planData: gymData.planData,
        planStartDate: gymData.planStartDate,
        expiryDate: subscription.expiryDate,
        daysRemaining: subscription.daysRemaining,
        status: subscription.status,
        isFreePlan: subscription.isFreePlan,
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
      return res.status(200).json({
        action: false,
        message: "Plan is required",
      });
    }

    const gymData = await Gym.findOne({ id: gymId });
    if (!gymData) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    const planData = await Plan.findOne({ id: planId, isActive: true });
    if (!planData) {
      return res.status(200).json({
        action: false,
        message: "Plan not found",
      });
    }

    const amount = Number(planData.amount || 0);
    if (amount <= 0) {
      await activatePlanForGym({ gymData, planData });
      return res.status(200).json({
        action: true,
        message: "Free plan activated successfully",
        data: {
          isFreePlan: true,
          gym: gymData,
        },
      });
    }

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

    const paymentEntry = await SubscriptionPayment.create({
      gymId,
      planId: planData.id,
      plan: {
        id: planData.id,
        name: planData.name,
        duration: Number(planData.duration || 0),
        amount,
      },
      orderId: order.id,
      amount,
      currency: order.currency,
      status: "created",
      provider: order.provider || "razorpay",
      notes: order.notes,
    });

    return res.status(200).json({
      action: true,
      message: "Subscription payment order created",
      data: {
        order,
        payment: {
          id: paymentEntry.id,
          orderId: paymentEntry.orderId,
          amount: paymentEntry.amount,
          currency: paymentEntry.currency,
          status: paymentEntry.status,
          provider: paymentEntry.provider,
        },
        razorpayKeyId: RAZORPAY_KEY_ID || null,
      },
    });
  } catch (error) {
    return res.status(200).json({
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
      paymentId,
      planId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const orderId = razorpay_order_id;
    const razorpayPaymentId = razorpay_payment_id || paymentId;

    if (!orderId || !planId) {
      return res.status(200).json({
        action: false,
        message: "Order id and plan id are required",
      });
    }

    const gymData = await Gym.findOne({ id: gymId });
    if (!gymData) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    const planData = await Plan.findOne({ id: planId, isActive: true });
    if (!planData) {
      return res.status(200).json({
        action: false,
        message: "Plan not found",
      });
    }

    const paymentEntry = await SubscriptionPayment.findOne({ gymId, orderId });

    if (!paymentEntry) {
      return res.status(200).json({
        action: false,
        message: "Payment entry not found",
      });
    }

    let isVerified = false;

    if (
      paymentEntry.provider === "razorpay" &&
      RAZORPAY_KEY_SECRET &&
      razorpay_signature &&
      razorpayPaymentId
    ) {
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${razorpayPaymentId}`)
        .digest("hex");

      isVerified = expectedSignature === razorpay_signature;
    } else {
      isVerified = true;
    }

    if (!isVerified) {
      paymentEntry.status = "failed";
      await paymentEntry.save();

      return res.status(200).json({
        action: false,
        message: "Payment verification failed",
      });
    }

    paymentEntry.paymentId = razorpayPaymentId;
    paymentEntry.signature = razorpay_signature;
    paymentEntry.status =
      paymentEntry.provider === "mock" ? "mock-paid" : "paid";
    paymentEntry.paidAt = new Date();
    await paymentEntry.save();

    const updatedGym = await activatePlanForGym({ gymData, planData });

    return res.status(200).json({
      action: true,
      message: "Subscription activated successfully",
      data: {
        gym: updatedGym,
        payment: paymentEntry,
      },
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error verifying subscription payment",
      error: error.message,
    });
  }
};

exports.activateSubscriptionPlan = async (req, res) => {
  try {
    const gymId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(200).json({
        action: false,
        message: "Plan is required",
      });
    }

    const gymData = await Gym.findOne({ id: gymId });
    if (!gymData) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    const planData = await Plan.findOne({ id: planId, isActive: true });
    if (!planData) {
      return res.status(200).json({
        action: false,
        message: "Plan not found",
      });
    }

    await activatePlanForGym({ gymData, planData });

    return res.status(200).json({
      action: true,
      message: "Subscription plan activated",
      data: gymData,
    });
  } catch (error) {
    return res.status(200).json({
      action: false,
      message: "Error activating subscription plan",
      error: error.message,
    });
  }
};
