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
    // Periksa apakah token sudah di-blacklist
    const blacklistedToken = await prisma.blacklistedToken.findUnique({
      where: { token },
    });

    if (blacklistedToken) {
      return res
        .status(401)
        .json({ success: false, message: "Token is blacklisted" });
    }

    // Verifikasi token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
module.exports = authMiddleware;
