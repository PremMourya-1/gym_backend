const GymClient = require("../models/gymClients");
const gymPlan = require("../models/gymPlan");

exports.getDashboard = async (req, res) => {
  try {
    const gymId = req.user.id;
    const today = new Date();

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const last12Months = new Date(
      today.getFullYear(),
      today.getMonth() - 11,
      1,
    );

    const clients = await GymClient.find({
      "gym.id": gymId,
      active: true,
    });

    const plans = await gymPlan.find({ "gym.id": gymId });

    const planMap = {};
    plans.forEach((p) => {
      planMap[p.id] = {
        duration: p.duration,
        name: p.name,
      };
    });
    let totalClients = clients.length;
    let thisMonthRegistered = 0;
    let todayRegistered = 0;
    let thisMonthCollection = 0;
    let todayCollection = 0;
    let expired = 0;
    let expiringSoon = 0;
    let totalPendingAmount = 0;
    let male = 0;
    let female = 0;

    let monthlyRevenueMap = {};
    let monthlyDiscountMap = {};
    let monthlyPendingMap = {};

    // ✅ UPDATED
    let planDistribution = {};
    let planRevenueMap = {};

    let expiredClients = [];
    let todaysRenewals = [];

    // ✅ normalize today once
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    clients.forEach((c) => {
      const joinDate = new Date(c.joiningDate);
      const createdAt = new Date(c.createdAt);
      joinDate.setHours(0, 0, 0, 0);
      createdAt.setHours(0, 0, 0, 0);

      const renewalDateRaw = c.lastRenewalDate
        ? new Date(c.lastRenewalDate)
        : new Date(c.joiningDate);

      renewalDateRaw.setHours(0, 0, 0, 0);

      const planDurationMonths = planMap[c.planId]?.duration || 0;

      const paid = Number(c.paidAmount || 0);
      const discount = Number(c.discountAmount || 0);
      const pending = Number(c.pendingAmount || 0);

      // ✅ registrations
      if (joinDate >= startOfMonth) thisMonthRegistered++;
      // updated logic by prem
      //  yaha neeche createdat ki jagah joining date thi
      if (createdAt >= startOfToday) todayRegistered++;

      // ✅ collection (cash flow)
      if (renewalDateRaw >= startOfMonth || joinDate >= startOfMonth) {
        thisMonthCollection += paid;
      }
      // updated logic by prem
      if (createdAt >= startOfToday) todayCollection += paid;

      if (renewalDateRaw >= startOfToday) {
        // todayCollection += paid; // pahle esa tha
        todaysRenewals.push({
          clientName: c.clientName,
          plan: c.plan?.name,
          paidAmount: paid,
        });
      }

      // ✅ last 12 months
      if (renewalDateRaw >= last12Months) {
        const key = `${renewalDateRaw.getFullYear()}-${renewalDateRaw.getMonth()}`;

        monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + paid;
        monthlyDiscountMap[key] = (monthlyDiscountMap[key] || 0) + discount;
        monthlyPendingMap[key] = (monthlyPendingMap[key] || 0) + pending;
      }

      // ✅ gender
      if (c.gender === "male") male++;
      if (c.gender === "female") female++;

      // ============================
      // ✅ EXPIRY CALCULATION
      // ============================

      const baseDate = c.lastRenewalDate
        ? new Date(c.lastRenewalDate)
        : new Date(c.joiningDate);

      const expiryDate = new Date(baseDate);
      expiryDate.setMonth(expiryDate.getMonth() + planDurationMonths);

      const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expired++;

        expiredClients.push({
          id: c.id,
          clientName: c.clientName,
          mobileNo: c.mobileNo,
          pendingAmount: pending,
          daysExpired: Math.abs(diffDays),
        });
      } else if (diffDays <= 5) {
        expiringSoon++;
      }

      // ============================

      // ✅ total pending
      totalPendingAmount += pending;

      // ✅ plan distribution
      const planName = c.plan?.name || "Unknown";
      planDistribution[planName] = (planDistribution[planName] || 0) + 1;

      // ✅ MRR
      const monthlyRevenue = paid / planDurationMonths;

      planRevenueMap[planName] =
        (planRevenueMap[planName] || 0) + monthlyRevenue;
    });

    // ✅ sort expired clients
    expiredClients = expiredClients
      .sort((a, b) => b.daysExpired - a.daysExpired)
      .slice(0, 10);
    // 12 month analytics
    const last12MonthAnalytics = [];
    const baseDate = new Date(today.getFullYear(), today.getMonth(), 1);

    for (let i = 11; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setMonth(baseDate.getMonth() - i);

      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const month = d.toLocaleDateString("en-IN", { month: "short" });

      const revenue = monthlyRevenueMap[key] || 0;
      const discount = monthlyDiscountMap[key] || 0;
      const pending = monthlyPendingMap[key] || 0;

      last12MonthAnalytics.push({
        month,
        revenue,
        pending,
        discount,
        expected: revenue + pending + discount,
      });
    }

    // ✅ FINAL PLAN DATA
    const planDistributionData = Object.keys(planDistribution).map((key) => ({
      name: key,
      value: planDistribution[key],
      revenue: Math.round(planRevenueMap[key] || 0), // clean value
    }));

    const recentClients = await GymClient.find({
      "gym.id": gymId,
      active: true,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("clientName mobileNo plan joiningDate lastRenewalDate");

    res.status(200).json({
      action: true,
      message: "Dashboard data fetched",
      data: {
        totalClients,
        thisMonthRegistered,
        todayRegistered,
        thisMonthCollection,
        todayCollection,
        expired,
        expiringSoon,
        totalPendingAmount,
        gender: { male, female },
        recentClients,
        expiredClients,
        todaysRenewals,

        last12MonthAnalytics,
        planDistribution: planDistributionData,
      },
    });
  } catch (e) {
    res.status(500).json({
      action: false,
      message: "Error fetching dashboard",
      error: e.message,
    });
  }
};
