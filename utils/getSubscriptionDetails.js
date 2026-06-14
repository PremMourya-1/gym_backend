const { SUBSCRIPTION_PAGE_LINK } = require("./constent");

const getSubscriptionDetails = (gymData) => {
  const expiryDate = gymData?.planEndDate
    ? new Date(gymData.planEndDate)
    : null;

  let daysRemaining = 0;
  let isExpired = false;

  if (expiryDate) {
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
module.exports = { getSubscriptionDetails, buildNotification };
