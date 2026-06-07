const express = require("express");
const router = express.Router();

const {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
} = require("../controllers/contactController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ PUBLIC - without auth
router.post("/", createContact);

// ✅ PROTECTED - with auth
router.get("/", authMiddleware, getAllContacts);
router.get("/:id", authMiddleware, getContactById);
router.put("/:id", authMiddleware, updateContactStatus);
router.delete("/:id", authMiddleware, deleteContact);

module.exports = router;
