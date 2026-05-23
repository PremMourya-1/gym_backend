const Offer = require("../models/offer");

const getApplicableOffer = async ({ gymId, planId, referenceDate }) => {
  if (!gymId || !planId || !referenceDate) {
    return null;
  }

  return Offer.findOne({
    "gym.id": gymId,
    planId,
    isActive: true,
    offerStartDate: { $lte: referenceDate },
    offerEndDate: { $gte: referenceDate },
  }).sort({ days: -1, offerEndDate: -1, createdAt: -1 });
};

const calculateExpiryDate = ({
  startDate,
  durationMonths = 0,
  bonusDays = 0,
}) => {
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + Number(durationMonths || 0));
  expiryDate.setDate(expiryDate.getDate() + Number(bonusDays || 0));
  return expiryDate;
};

const resolveClientExpiryDate = ({ client, durationMonths = 0 }) => {
  if (client?.expiryDate) {
    return new Date(client.expiryDate);
  }

  const baseDate = client?.lastRenewalDate
    ? new Date(client.lastRenewalDate)
    : new Date(client?.joiningDate);

  return calculateExpiryDate({
    startDate: baseDate,
    durationMonths,
  });
};

module.exports = {
  getApplicableOffer,
  calculateExpiryDate,
  resolveClientExpiryDate,
};
