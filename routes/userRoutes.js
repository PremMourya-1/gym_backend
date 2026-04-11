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
  getExpiredClients,
  updateClientPhoto,
} = require("../controllers/gymClientController");
const { getDashboard } = require("../controllers/gymDashboard");
const {
  getClientRenewals,
  createRenewal,
  receivePending,
} = require("../controllers/renewPlan");
const { changePassword } = require("../controllers/gymController");
const router = express.Router();

router.route("/gymPlan").get(authMiddleware, getGymPlan);
router.route("/gymPlan/add").post(authMiddleware, createGymPlan);
router
  .route("/gymPlan/:id")
  .put(authMiddleware, updateGymPlan)
  .delete(authMiddleware, deleteGymPlan);

router.route("/gymClient").get(authMiddleware, getGymClient);
router
  .route("/gymClient/add")
  .post(authMiddleware, upload.single("photo"), createGymClient);
router
  .route("/gymClient/:id")
  .put(authMiddleware, upload.single("photo"), updateGymClient);
router.route("/gymClient/:id").delete(authMiddleware, deleteGymClient);
router.put(
  "/gymClient/client-photo/:id",
  authMiddleware,
  upload.single("photo"),
  updateClientPhoto,
);

router.route("/dashboard").get(authMiddleware, getDashboard);
//
router.route("/renew/add").post(authMiddleware, createRenewal);
router.route("/renew/:clientId").get(authMiddleware, getClientRenewals);
router
  .route("/renew/receivePending/:clientId")
  .post(authMiddleware, receivePending);

router.put("/change-password", authMiddleware, changePassword);

module.exports = router;
