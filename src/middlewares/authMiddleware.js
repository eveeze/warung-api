const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    // Verifikasi token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cari user berdasarkan ID dari token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Tambahkan user ke object request
    req.user = user;
    next();
  } catch (err) {
    // Handle error spesifik JWT
    let message = "Invalid token";
    if (err.name === "TokenExpiredError") {
      message = "Token expired";
    } else if (err.name === "JsonWebTokenError") {
      message = "Malformed token";
    }

    res.status(401).json({
      success: false,
      message: message,
    });
  }
};

module.exports = authMiddleware;
