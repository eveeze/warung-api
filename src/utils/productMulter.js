//utils/productMulter.js

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "product",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const uploadProduct = multer({ storage });

module.exports = uploadProduct;
