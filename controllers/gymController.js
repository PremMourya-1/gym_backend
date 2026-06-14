const fs = require("fs");
const path = require("path");
const Gym = require("../models/gym");
const EmailVerification = require("../models/emailVerification");
const bcrypt = require("bcryptjs");
const plan = require("../models/plan");
const sendEmail = require("../utils/sendEmail");

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getVerifyEmailHtml = async (otp) => {
  const filePath = path.join(__dirname, "../public/verifyEmail.html");
  const html = await fs.promises.readFile(filePath, "utf8");
  return html.replace("${otp}", otp);
};

const sendVerificationEmail = async (email, otp) => {
  const html = await getVerifyEmailHtml(otp);
  await sendEmail({
    to: email,
    subject: "GymFox Email Verification Code",
    html,
  });
};

const getPlanEndDate = (durationMonths) => {
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + Number(durationMonths || 0));
  return endDate;
};

// ✅ GET ALL
exports.getGym = async (req, res) => {
  try {
    const data = await Gym.find();

    res.status(200).json({
      action: true,
      message: "gym list fetched",
      data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error fetching gym data",
      error: e.message,
    });
  }
};
exports.gymProfile = async (req, res) => {
  try {
    const data = await Gym.findOne({ id: req.user.id }).select(
      "-password -authCode -emailVerified -emailVerificationCode -emailVerificationCodeExpires",
    );

    res.status(200).json({
      action: true,
      message: "gym list fetched",
      data,
    });
  } catch (e) {
    res.status(500).json({
      action: false,
      message: "Error fetching gym data",
      error: e.message,
    });
  }
};

// ✅ CREATE
exports.createGym = async (req, res) => {
  try {
    const payload = req.body;

    const hash = await bcrypt.hash(payload.password, 10);
    const planData = await plan.findOne({ id: payload.planId });

    const data = await Gym.create({
      ...payload,
      password: hash,
      planData: {
        id: planData.id,
        name: planData.name,
        duration: planData.duration,
        amount: planData.amount,
      },
      planEndDate: getPlanEndDate(planData.duration),
    });

    res.status(200).json({
      action: true,
      message: "gym created successfully",
      data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error creating gym",
      error: e.message,
    });
  }
};

// ✅ UPDATE
exports.updateGym = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body;

    // 🔐 agar password aa raha hai to hash karo
    if (payload.password) {
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    const data = await Gym.findOneAndUpdate({ id }, payload, {
      new: true,
    });

    if (!data) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "gym updated successfully",
      data,
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error updating gym",
      error: e.message,
    });
  }
};

// ✅ DELETE
exports.deleteGym = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await Gym.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(200).json({
        action: false,
        message: "gym not found",
      });
    }

    res.status(200).json({
      action: true,
      message: "gym deleted successfully",
    });
  } catch (e) {
    res.status(200).json({
      action: false,
      message: "Error deleting gym",
      error: e.message,
    });
  }
};

// ✅ CHANGE PASSWORD
exports.changePassword = async (req, res) => {
  try {
    console.log(req.user);
    const gymId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // ✅ validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(200).json({
        action: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(200).json({
        action: false,
        message: "New password and confirm password must match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(200).json({
        action: false,
        message: "Password must be at least 6 characters",
      });
    }

    const gymData = await Gym.findOne({ id: gymId });

    if (!gymData) {
      return res.status(200).json({
        action: false,
        message: "Gym not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, gymData.password);

    if (!isMatch) {
      return res.status(200).json({
        action: false,
        message: "Old password is incorrect",
      });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    gymData.password = hash;

    await gymData.save();

    res.json({
      action: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.log(err); // 👈 important (check actual error)
    res.status(200).json({
      action: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ✅ FREE REGISTRATION - without auth
exports.freeRegister = async (req, res) => {
  try {
    const {
      gymName,
      ownerName,
      email,
      phone,
      username,
      password,
      address,
      city,
      state,
    } = req.body;

    // ✅ VALIDATION
    if (!gymName || !ownerName || !email || !phone || !username || !password) {
      return res.status(200).json({
        action: false,
        message:
          "Please provide gymName, ownerName, email, phone, username, and password",
      });
    }

    // ✅ CHECK IF PHONE ALREADY EXISTS
    const existingGym = await Gym.findOne({ phone: String(phone) });
    if (existingGym) {
      return res.status(200).json({
        action: false,
        message: "Gym already registered with this phone number",
      });
    }

    // ✅ CHECK IF USERNAME ALREADY EXISTS
    const existingUsername = await Gym.findOne({ username: String(username) });
    if (existingUsername) {
      return res.status(200).json({
        action: false,
        message: "Username already taken",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ✅ CHECK IF EMAIL ALREADY EXISTS
    const existingEmail = await Gym.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(200).json({
        action: false,
        message: "Email already registered",
      });
    }

    // ✅ GET FREE PLAN
    const freePlan = await plan.findOne({ name: "free" });

    if (!freePlan) {
      return res.status(200).json({
        action: false,
        message: "Free plan not available",
      });
    }

    // ✅ HASH PASSWORD
    const hash = await bcrypt.hash(String(password), 10);
    const otp = generateOtp();
    const verification = await EmailVerification.findOne({
      email: normalizedEmail,
      verified: true,
    });
    const isEmailVerified = Boolean(verification);

    // ✅ CREATE GYM
    const newGym = await Gym.create({
      gymName: gymName.trim(),
      ownerName: ownerName.trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      username: username.trim(),
      password: hash,
      address: address ? address.trim() : undefined,
      city: city ? city.trim() : undefined,
      state: state ? state.trim() : undefined,
      planId: freePlan.id,
      planData: {
        id: freePlan.id,
        name: freePlan.name,
        duration: freePlan.duration,
        amount: freePlan.amount,
      },
      planEndDate: getPlanEndDate(freePlan.duration),
      status: true,
      emailVerified: isEmailVerified,
      emailVerificationCode: isEmailVerified ? undefined : otp,
      emailVerificationCodeExpires: isEmailVerified
        ? undefined
        : new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      await sendVerificationEmail(newGym.email, otp);
    } catch (emailError) {
      console.log("Verification email failed:", emailError);
      return res.status(200).json({
        action: false,
        message:
          "Registration succeeded but verification email could not be sent. Please try resend verification.",
        error: emailError.message,
      });
    }

    res.status(200).json({
      action: true,
      message: "Gym registered successfully. Verification code sent to email.",
      data: {
        id: newGym.id,
        email: newGym.email,
        username: newGym.username,
        emailVerified: newGym.emailVerified,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(200).json({
      action: false,
      message: "Error during registration",
      error: error.message,
    });
  }
};

exports.sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(200).json({
        action: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const gymData = await Gym.findOne({ email: normalizedEmail });
    if (gymData) {
      return res.status(200).json({
        action: false,
        message: "Email already registered",
      });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const verification = await EmailVerification.findOneAndUpdate(
      { email: normalizedEmail },
      {
        code: otp,
        expiresAt,
        verified: false,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    await sendVerificationEmail(normalizedEmail, otp);

    res.status(200).json({
      action: true,
      message: "Verification code sent to email",
      data: { email: normalizedEmail },
    });
  } catch (error) {
    console.log("sendVerificationCode error:", error);
    res.status(200).json({
      action: false,
      message: "Could not send verification code",
      error: error.message,
    });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(200).json({
        action: false,
        message: "Email and otp are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const verification = await EmailVerification.findOne({
      email: normalizedEmail,
    });

    if (!verification) {
      return res.status(200).json({
        action: false,
        message: "No verification request found for this email",
      });
    }

    if (verification.verified) {
      return res.status(200).json({
        action: true,
        message: "Email already verified",
        data: { email: normalizedEmail, emailVerified: true },
      });
    }

    if (!verification.expiresAt || new Date() > verification.expiresAt) {
      return res.status(200).json({
        action: false,
        message: "Verification code expired. Please resend the code.",
      });
    }

    if (String(otp).trim() !== verification.code) {
      return res.status(200).json({
        action: false,
        message: "Invalid verification code",
      });
    }

    verification.verified = true;
    verification.code = undefined;
    verification.expiresAt = undefined;
    await verification.save();

    const gymData = await Gym.findOne({ email: normalizedEmail });
    if (gymData && !gymData.emailVerified) {
      gymData.emailVerified = true;
      await gymData.save();
    }

    res.status(200).json({
      action: true,
      message: "Email verified successfully",
      data: { email: normalizedEmail, emailVerified: true },
    });
  } catch (error) {
    console.log("verifyEmailOtp error:", error);
    res.status(200).json({
      action: false,
      message: "Email verification failed",
      error: error.message,
    });
  }
};
