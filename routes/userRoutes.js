const express = require("express");
const upload = require("../middleware/upload");
const {
  getGymPlan,
  createGymPlan,
  updateGymPlan,
  deleteGymPlan,
} = require("../controllers/gymPlanController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  updateGymClient,
  deleteGymClient,
  createGymClient,
  getGymClient,
  getGymClientExcelData,
  getExpiredClients,
  updateClientPhoto,
  bulkImportGymClients,
} = require("../controllers/gymClientController");
const { getDashboard } = require("../controllers/gymDashboard");
const {
  getClientRenewals,
  createRenewal,
  receivePending,
} = require("../controllers/renewPlan");
const { changePassword } = require("../controllers/gymController");
const {
  getSubscriptionPlans,
  getCurrentSubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  activateSubscriptionPlan,
} = require("../controllers/subscriptionController");
const {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} = require("../controllers/offerController");
const router = express.Router();

router.route("/gymPlan").get(authMiddleware, getGymPlan);
router.route("/gymPlan/add").post(authMiddleware, createGymPlan);
router
  .route("/gymPlan/:id")
  .put(authMiddleware, updateGymPlan)
  .delete(authMiddleware, deleteGymPlan);

router.route("/gymClient").get(authMiddleware, getGymClient);
router
  .route("/gymClient/excel-data")
  .get(authMiddleware, getGymClientExcelData);
router
  .route("/gymClient/add")
  .post(authMiddleware, upload.single("photo"), createGymClient);
router
  .route("/gymClient/:id")
  .put(authMiddleware, upload.single("photo"), updateGymClient);
router.route("/gymClient/:id").delete(authMiddleware, deleteGymClient);
router.put("/gymClient/client-photo/:id", authMiddleware, updateClientPhoto);
router.post("/gymClient/bulk-import", authMiddleware, bulkImportGymClients);

router.route("/offer").get(authMiddleware, getOffers);
router.route("/offer/add").post(authMiddleware, createOffer);
router
  .route("/offer/:id")
  .put(authMiddleware, updateOffer)
  .delete(authMiddleware, deleteOffer);

router.route("/dashboard").get(authMiddleware, getDashboard);
//
router.route("/renew/add").post(authMiddleware, createRenewal);
router.route("/renew/:clientId").get(authMiddleware, getClientRenewals);
router
  .route("/renew/receivePending/:clientId")
  .post(authMiddleware, receivePending);

router.put("/change-password", authMiddleware, changePassword);

router.route("/subscription/plans").get(authMiddleware, getSubscriptionPlans);
router
  .route("/subscription/current")
  .get(authMiddleware, getCurrentSubscription);
router
  .route("/subscription/create-order")
  .post(authMiddleware, createSubscriptionOrder);
router
  .route("/subscription/verify-payment")
  .post(authMiddleware, verifySubscriptionPayment);
router
  .route("/subscription/activate")
  .post(authMiddleware, activateSubscriptionPlan);

module.exports = router;
