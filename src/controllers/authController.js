const prisma = require("../utils/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  const { phone, email, name, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        phone,
        email,
        name,
        password: hashedPassword,
      },
    });
    res.status(201).json({ succes: true, data: user });
  } catch (err) {
    res.status(400).json({ succes: false, message: "registrasi user gagal" });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        succes: false,
        message: "invalid kredensial salah password atau email",
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.status(200).json({ succes: true, token });
  } catch (err) {
    res.status(500).json({ succes: false, message: "login gagal" });
  }
};

exports.logoutUser = async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: "No token provided" });
  }

  try {
    await prisma.blacklistedToken.create({
      data: { token },
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.status(200).json({ succes: true, data: user });
  } catch (err) {
    res
      .status(500)
      .json({ succes: false, message: "gagal mengambil data profile user" });
  }
};
