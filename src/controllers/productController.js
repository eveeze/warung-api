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

const QuerySchema = z.object({
  page: z.preprocess((val) => {
    if (!val) return 1;
    const num = Number(val);
    return isNaN(num) ? 1 : num;
  }, z.number().int().positive()),

  limit: z.preprocess((val) => {
    if (!val) return 10;
    const num = Number(val);
    return isNaN(num) ? 10 : num;
  }, z.number().int().positive()),

  search: z.string().optional(),
  searchFields: z.preprocess(
    (val) => (Array.isArray(val) ? val : val ? [val] : undefined),
    z.array(z.enum(["name", "barcode", "description"])).optional(),
  ),

  sortBy: z.enum(["name", "price", "stock", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  minPrice: z.preprocess((val) => {
    if (!val) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().int().positive().optional()),

  maxPrice: z.preprocess((val) => {
    if (!val) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().int().positive().optional()),

  category: z.preprocess((val) => {
    if (!val) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().int().positive().optional()),

  inStock: z.preprocess((val) => {
    if (val === "true") return true;
    if (val === "false") return false;
    return undefined;
  }, z.boolean().optional()),

  minStock: z.preprocess((val) => {
    if (!val) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().int().min(0).optional()),

  maxStock: z.preprocess((val) => {
    if (!val) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().int().optional()),
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
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, products] = await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({
        take: Number(limit),
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    return res.status(200).json({
      success: true,
      data: products,
      metadata: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (err) {
    console.error("Get all products error:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mendapatkan produk",
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

exports.findProducts = async (req, res) => {
  try {
    // Preprocess query parameters to handle arrays
    const queryParams = {
      ...req.query,
      searchFields: req.query.searchFields
        ? Array.isArray(req.query.searchFields)
          ? req.query.searchFields
          : [req.query.searchFields]
        : undefined,
    };

    const {
      page,
      limit,
      search,
      searchFields,
      sortBy,
      sortOrder,
      minPrice,
      maxPrice,
      category,
      inStock,
      minStock,
      maxStock,
    } = QuerySchema.parse(queryParams);

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build search conditions
    const searchConditions = [];

    if (search) {
      // Default search fields if none specified
      const fieldsToSearch = searchFields || ["name", "barcode", "description"];

      const searchQuery = fieldsToSearch.map((field) => {
        if (field === "barcode") {
          // Exact match for barcode
          return { [field]: { equals: search } };
        } else {
          // Case-insensitive partial match for text fields
          return { [field]: { contains: search, mode: "insensitive" } };
        }
      });

      searchConditions.push({ OR: searchQuery });
    }

    // Build where clause
    const where = {
      AND: [
        ...searchConditions,
        // Price range
        minPrice ? { price: { gte: minPrice } } : {},
        maxPrice ? { price: { lte: maxPrice } } : {},
        // Category filter
        category ? { categoryId: category } : {},
        // Stock status and range
        inStock !== undefined
          ? {
              stock: inStock ? { gt: 0 } : { equals: 0 },
            }
          : {},
        minStock !== undefined ? { stock: { gte: minStock } } : {},
        maxStock !== undefined ? { stock: { lte: maxStock } } : {},
      ].filter((condition) => Object.keys(condition).length > 0),
    };

    // Execute count and findMany in parallel
    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      data: products,
      metadata: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      filters: {
        search,
        searchFields,
        sortBy,
        sortOrder,
        minPrice,
        maxPrice,
        category,
        inStock,
        minStock,
        maxStock,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: err.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
          receivedValue: error.received,
        })),
      });
    }

    console.error("Product search error:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mencari produk",
    });
  }
};
