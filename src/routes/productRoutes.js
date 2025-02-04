const express = require("express");
const router = express.Router();
const upload = require("../utils/productMulter");
const productController = require("../controllers/productController");

router.post("/", upload.single("image"), productController.createProduct);
router.get("/", productController.getAllProduct);
router.get("/:productId", productController.getProductById);
router.delete("/:identifier", productController.deleteProduct);
router.put(
  "/:identifier",
  upload.single("image"),
  productController.updateProduct,
);

module.exports = router;
