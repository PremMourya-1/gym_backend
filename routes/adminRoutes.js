const express = require("express");
const router = express.Router();

const {
  createPlan,
  getPlans,
  updatePlan,
  deletePlan,
} = require("../controllers/planController");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getGym,
  createGym,
  updateGym,
  deleteGym,
} = require("../controllers/gymController");

router.get("/plan", authMiddleware, getPlans);
router.post("/plan/add", authMiddleware, createPlan);
router.put("/plan/:id", authMiddleware, updatePlan);
router.delete("/plan/:id", authMiddleware, deletePlan);
//
router.get("/gym", authMiddleware, getGym);
router.post("/gym/add", authMiddleware, createGym);
router.put("/gym/:id", authMiddleware, updateGym);
router.delete("/gym/:id", authMiddleware, deleteGym);

module.exports = router;
