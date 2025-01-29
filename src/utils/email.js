const nodemailer = require("nodemailer");
const fs = require("fs");

const path = require("path");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOtp = async (email, otp) => {
  try {
    const templatePath = path.join(__dirname, "email.html");
    let htmlTemplate = fs.readFileSync(templatePath, "utf8");

    htmlTemplate = htmlTemplate.replace("{{OTP}}", otp);

    const mailOptions = {
      from: `Warung Mbah Manto to <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "OTP Verification for Your Account",
      html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
};
module.exports = {
  transporter,
  generateOTP,
  sendOtp,
};
