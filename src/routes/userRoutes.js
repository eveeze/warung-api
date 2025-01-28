const express = require("express");
const router = express.Router();

const userController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.post("/logout", authMiddleware, userController.logoutUser);
router.get("/profile", authMiddleware, userController.getUserProfile);

module.exports = router;
