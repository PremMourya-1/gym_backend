const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  try {
    const token = req.cookies.token;
    console.log("yahi to hai token", token);
    if (!token) {
      return res.status(401).json({
        action: false,
        message: "No token provided",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      action: false,
      message: "Invalid token",
    });
  }
};
