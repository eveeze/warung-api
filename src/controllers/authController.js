const prisma = require("../utils/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendOtp, generateOTP } = require("../utils/email");
exports.registerUser = async (req, res) => {
  try {
    const { phone, email, name, password } = req.body;
    let user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "user alredy exits" });
    }

    const otp = generateOTP();

    const salt = 10;
    const hashedPassword = await bcrypt.hash(password, salt);
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          email,
          name,
          password: hashedPassword,
          verificationOtp: otp,
          isVerified: false,
          verificationOtpCreatedAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: {
          email,
        },
        data: {
          phone,
          name,
          password: hashedPassword,
          verificationOtp: otp,
          verificationOtpCreatedAt: new Date(),
        },
      });
    }
    await sendOtp(email, otp);
    return res.status(200).json({
      success: true,
      message: "registrasi berhasil , otp dikirim ke email anda",
    });
  } catch (err) {
    console.error(`terjadi error saat registrasi : ${err}`);
    res.status(400).json({ success: false, message: "registrasi user gagal" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "user tidak ditemukan",
      });
    }

    if (user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "user sudah terverifikasi",
      });
    }

    if (user.verificationOtp !== otp) {
      return res.status(402).json({
        success: false,
        messsage: "otp tidak cocok",
      });
    }
    const otpExpiryTime = 5 * 60 * 1000;
    const now = new Date();
    const otpGeneratedAt = user.verificationOtpCreatedAt;
    const timeDifference = now - otpGeneratedAt;

    if (timeDifference > otpExpiryTime) {
      return res.status(405).json({
        success: false,
        message: "otp sudah kadaluarsa",
      });
    }

    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationOtp: null,
        verificationOtpCreatedAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "verifikasi registrasi berhasil",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "email akun tidak ditemukan , tolong registrasi terlebih dahulu",
      });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "user sudah verified" });
    } else {
      const otp = generateOTP();

      await prisma.user.update({
        where: { email },
        data: {
          verificationOtp: otp,
          verificationOtpCreatedAt: new Date(),
        },
      });
      await sendOtp(email, otp);
      return res.status(200).json({
        success: true,
        message: "kode otp telah dikirim ulang ke email anda",
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat mengirimkan ulang otp",
    });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        password: true,
        isVerified: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    const { password: _, ...userData } = user;

    res.status(200).json({
      success: true,
      data: {
        token,
        user: userData,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "jika email terdaftar otp akan dikirimkan",
      });
    }

    const otp = generateOTP();
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        resetPasswordOtp: otp,
        resetOtpCreatedAt: new Date(),
        isResetPasswordVerified: false,
      },
    });
    sendOtp;
    return res.status(200).json({
      success: true,
      message: "otp telah dikirimkan ke email untuk verifikasi lupa password",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat mengirimkan permintaan lupa password",
    });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.resetPasswordOtp) {
      return res.status(404).json({
        success: false,
        message: "email tidak ditemukan atau otp tidak valid ",
      });
    }

    if (user.resetPasswordOtp !== otp) {
      return res.status(401).json({ success: false, message: "otp salah " });
    }
    const otpExpiryTime = 5 * 60 * 1000;
    const now = new Date();
    const otpGeneratedAt = user.resetOtpCreatedAt;
    const timeDifference = now - otpGeneratedAt;

    if (timeDifference > otpExpiryTime) {
      return res.status(405).json({
        success: false,
        message: "otp sudah kadaluarsa",
      });
    }

    await prisma.user.update({
      where: { email },
      data: {
        isResetPasswordVerified: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "otp berhasil diverifikasi, silahkan reset password",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "gagal memverifikasi otp" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isResetPasswordVerified) {
      return res.status(401).json({
        success: false,
        message: "silahkan verifikasi otp reset password ",
      });
    } else {
      const salt = 10;
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          resetPasswordOtp: null,
          resetOtpCreatedAt: null,
          isResetPasswordVerified: false,
        },
      });

      return res
        .status(200)
        .json({ success: true, message: "password berhasil diganti" });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat mengganti password ",
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
    });
  }
};
