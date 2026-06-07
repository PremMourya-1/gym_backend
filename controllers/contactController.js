const Contact = require("../models/contact");

// ✅ CREATE - POST contact (without auth)
exports.createContact = async (req, res) => {
  try {
    const { name, mobile, email, subject, message } = req.body;

    // Validation
    if (!name || !mobile || !subject || !message) {
      return res.status(400).json({
        action: false,
        message: "Please provide name, mobile, subject, and message",
      });
    }

    const data = await Contact.create({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim() : undefined,
      subject: subject.trim(),
      message: message.trim(),
      status: "new",
    });

    res.status(201).json({
      action: true,
      message: "Contact inquiry submitted successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      action: false,
      message: "Error creating contact",
      error: error.message,
    });
  }
};

// ✅ GET ALL - GET all contacts (with auth)
exports.getAllContacts = async (req, res) => {
  try {
    const data = await Contact.find().sort({ createdAt: -1 });

    res.status(200).json({
      action: true,
      message: "Contact inquiries fetched successfully",
      total: data.length,
      data,
    });
  } catch (error) {
    res.status(500).json({
      action: false,
      message: "Error fetching contacts",
      error: error.message,
    });
  }
};

// ✅ GET SINGLE
exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Contact.findOne({ id });

    if (!data) {
      return res.status(404).json({
        action: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "Contact fetched successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      action: false,
      message: "Error fetching contact",
      error: error.message,
    });
  }
};

// ✅ UPDATE STATUS
exports.updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["new", "read", "responded"].includes(status)) {
      return res.status(400).json({
        action: false,
        message: "Invalid status. Use: new, read, or responded",
      });
    }

    const data = await Contact.findOneAndUpdate(
      { id },
      { status },
      { new: true },
    );

    if (!data) {
      return res.status(404).json({
        action: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "Contact status updated",
      data,
    });
  } catch (error) {
    res.status(500).json({
      action: false,
      message: "Error updating contact",
      error: error.message,
    });
  }
};

// ✅ DELETE
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Contact.findOneAndDelete({ id });

    if (!data) {
      return res.status(404).json({
        action: false,
        message: "Contact not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      action: false,
      message: "Error deleting contact",
      error: error.message,
    });
  }
};
