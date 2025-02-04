const prisma = require("../utils/prisma");
const z = require("zod");
const cloudinary = require("../utils/cloudinary");
const ProductSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  stock: z.preprocess((val) => Number(val), z.number().int().min(0)),
  minStock: z.preprocess((val) => Number(val), z.number().int().min(0)),
  price: z.preprocess((val) => Number(val), z.number().int().positive()),
  costPrice: z.preprocess((val) => Number(val), z.number().int().positive()),
  description: z.string().max(255).optional(),
  image: z.string().optional(),
  category: z.preprocess((val) => Number(val), z.number().int()),
});

exports.createProduct = async (req, res) => {
  try {
    const data = ProductSchema.parse(req.body);

    // Validasi kategori sebelum membuat produk
    const categoryExists = await prisma.category.findUnique({
      where: { id: data.category },
    });

    if (!categoryExists) {
      return res
        .status(400)
        .json({ success: false, message: "Kategori tidak ditemukan" });
    }

    // Membuat slug unik jika tidak diberikan
    let slug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-");

    // Cek apakah slug sudah digunakan
    let slugExists = await prisma.product.findUnique({ where: { slug } });
    let count = 1;
    while (slugExists) {
      slug = `${data.name.toLowerCase().replace(/\s+/g, "-")}-${count}`;
      slugExists = await prisma.product.findUnique({ where: { slug } });
      count++;
    }

    // Cek apakah ada file gambar yang diunggah
    let imageUrl = req.file ? req.file.path : null;

    const product = await prisma.product.create({
      data: {
        ...data,
        slug,
        ...(imageUrl && { image: imageUrl }), // hanya menyertakan jika ada gambar
        category: { connect: { id: data.category } }, // Fix category relation
      },
    });

    console.log(product);
    res
      .status(201)
      .json({ success: true, message: "Produk berhasil dibuat", product });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors });
    }

    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Gagal membuat produk",
      message: "Terjadi kesalahan saat membuat produk",
    });
  }
};

exports.getAllProduct = async (req, res) => {
  try {
    const product = await prisma.product.findMany();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "produk kosong atau tidak ditemukan",
      });
    }
    return res.status(200).json({ success: true, product });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat mendapatkan produk",
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "produk tidak ditemukan" });
    }

    return res.status(201).json({ success: true, product });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat mencari detail produk",
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { identifier } = req.params;
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }, { barcode: identifier }],
      },
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "product tidak ditemukan" });
    }

    const imageUrl = product.image;
    if (imageUrl) {
      const publicId = imageUrl
        .split("/")
        .slice(-2)
        .join("/")
        .replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId);
    }

    await prisma.product.delete({
      where: { id: product.id },
    });
    return res
      .status(200)
      .json({ success: true, message: "berhasil menghapus produk" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "terjadi kesalahan saat menghapus produk",
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { identifier } = req.params;
    const data = ProductSchema.partial().parse(req.body);

    // Find product by ID or barcode only
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { barcode: identifier }],
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan",
      });
    }

    // Handle category update if provided
    let updateData = { ...data };
    if (data.category) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: data.category },
      });

      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
      }
    }
    let imageUrl = product.image;
    // Handle image upload if provided
    if (req.file) {
      // Delete old image if exists
      if (imageUrl) {
        try {
          const publicId = product.image
            .split("/")
            .slice(-2)
            .join("/")
            .replace(/\.[^/.]+$/, "");
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }
      imageUrl = req.file.path; // Set URL gambar baru
      updateData.image = imageUrl;
    }

    // Handle slug update if name changes
    if (data.name && data.name !== product.name) {
      let newSlug = data.name.toLowerCase().replace(/\s+/g, "-");
      let slugExists = await prisma.product.findFirst({
        where: {
          slug: newSlug,
          id: { not: product.id }, // Ensure the slug is unique for other products
        },
      });

      let count = 1;
      while (slugExists) {
        newSlug = `${data.name.toLowerCase().replace(/\s+/g, "-")}-${count}`;
        slugExists = await prisma.product.findFirst({
          where: {
            slug: newSlug,
            id: { not: product.id }, // Ensure the slug is unique for other products
          },
        });
        count++;
      }
      updateData.slug = newSlug;
    }

    // Perform the update with direct field updates
    const updatedProduct = await prisma.product.update({
      where: { id: product.id }, // Update by product ID only
      data: {
        name: updateData.name,
        stock: updateData.stock ? parseInt(updateData.stock) : undefined,
        price: updateData.price ? parseInt(updateData.price) : undefined,
        costPrice: updateData.costPrice
          ? parseInt(updateData.costPrice)
          : undefined,
        minStock: updateData.minStock
          ? parseInt(updateData.minStock)
          : undefined,
        description: updateData.description,
        barcode: updateData.barcode,
        image: updateData.image,
        slug: updateData.slug,
        ...(updateData.category && {
          category: {
            connect: { id: updateData.category },
          },
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Produk berhasil diperbarui",
      product: updatedProduct,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: err.errors,
      });
    }

    console.error("Update error:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memperbarui produk",
      error: err.message,
    });
  }
};
