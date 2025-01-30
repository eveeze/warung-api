const prisma = require("../utils/prisma");
const cloudinary = require("../utils/cloudinary");
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const imageUrl = req.file ? req.file.path : null;
    const category = await prisma.category.create({
      data: {
        name,
        description,
        image: imageUrl,
      },
    });
    res.status(200).json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: "kategori gagal dibuat " });
  }
};

exports.getAllCategory = async (req, res) => {
  try {
    const category = await prisma.category.findMany();
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "kategori kosong",
      });
    }
    return res.status(200).json({ success: true, category });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat mengambil semua kategori",
    });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "kategori tidak ditemukan" });
    }
    return res.status(200).json({ success: true, category });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat mengambil detail kategori",
    });
  }
};
