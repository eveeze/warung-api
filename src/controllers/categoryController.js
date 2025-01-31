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
    res
      .status(200)
      .json({ success: true, message: "berhasil membuat kategori", category });
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

exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;
    const existingCategory = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });

    if (!existingCategory) {
      return res
        .status(404)
        .json({ success: false, message: "kategori tidak ditemukan" });
    }

    let imageUrl = existingCategory.image; // Store the existing image URL
    if (req.file) {
      // If a new image is uploaded
      const publicId = imageUrl
        .split("/")
        .slice(-2)
        .join("/")
        .replace(/\.[^/.]+$/, ""); // Extract public ID from URL
      await cloudinary.uploader.destroy(publicId); // Delete the old image
      imageUrl = req.file.path; // Set the new image URL
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(categoryId) },
      data: {
        name: name || existingCategory.name,
        description: description || existingCategory.description,
        image: imageUrl,
      },
    });

    res.status(200).json({
      success: true,
      message: "kategori berhasil diperbarui",
      category: updatedCategory,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat memperbarui kategori",
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const idCategory = parseInt(categoryId);
    const category = await prisma.category.findUnique({
      where: { id: idCategory },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "kategori yang ingin dihapus tidak ditemukan",
      });
    }

    await prisma.category.delete({
      where: {
        id: idCategory,
      },
    });
    return res.status(200).json({
      success: true,
      message: "berhasil menghapus kategori",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat menghapus kategori",
    });
  }
};
