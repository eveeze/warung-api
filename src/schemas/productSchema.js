const z = require("zod");

const ProductSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  barcode: z.string().optional(),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  price: z.number().int().positive(),
  costPrice: z.number().int().positive(),
  description: z.string().optional(),
  image: z.string().optional(),
  category: z.number().int(),
});

module.exports = ProductSchema;
