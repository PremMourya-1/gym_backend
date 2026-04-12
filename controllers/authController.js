const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const gym = require("../models/gym");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hash,
      role,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.userLogin = async (req, res) => {
  const { phone, password } = req.body;
  console.log("admin login login");
  try {
    const user = await gym.findOne({ phone });

    if (!user)
      return res.status(200).json({ action: false, message: "User not found" });
    const { email, planId, address, city, state, ownerName, gymName } =
      user || {};

    const match = await bcrypt.compare(String(password), user.password);

    if (!match)
      return res.status(200).json({ action: false, message: "Wrong password" });

    const token = jwt.sign(
      { id: user.id, planId, email, address, city, state, ownerName, gymName },
      process.env.JWT_SECRET,
    );

    // for locale
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: false, // MUST (https ke liye)
    //   sameSite: "none", // 🔥 MOST IMPORTANT
    // });
    // for live
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // because backend is HTTPS (Render)
      sameSite: "none", // cross-site allowed
    });

    res.json({ action: true, message: "User login success", data: user });
  } catch (e) {
    console.log(e);
    res.json({ action: false, message: "login failed" });
  }
};

exports.adminLogin = async (req, res) => {
  const { password, mobileNo } = req.body;
  console.log("admin login");

  const admin = await User.findOne({
    mobileNo: String(mobileNo),
    role: "admin",
  });

  if (!admin) {
    return res
      .status(200)
      .json({ action: false, message: "invalid credentials" });
  }
  const match = String(password) === admin.password; // encrypt it

  if (!match) {
    return res
      .status(200)
      .json({ action: false, message: "invalid credentials" });
  }

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
  });

  res.json({
    action: true,
    message: "login successful",
    data: admin,
  });
};

exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // production me true
  });

  res.status(200).json({
    action: true,
    message: "Logged out successfully",
  });
};
