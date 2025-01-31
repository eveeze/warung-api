const express = require("express");
const router = express.Router();
const upload = require("../utils/multer");
const categoryController = require("../controllers/categoryController");

router.get("/", categoryController.getAllCategory);
router.get("/:categoryId", categoryController.getCategoryById);
router.post("/", upload.single("image"), categoryController.createCategory);
router.put(
  "/:categoryId",
  upload.single("image"),
  categoryController.updateCategory,
);
router.delete("/:categoryId", categoryController.deleteCategory);
module.exports = router;
