// app.js

const express = require("express");
const cors = require("cors");
require("dotenv").config();
// inisialisasi routes
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const errorHandler = require("./middlewares/errorHandler");
// inisialisasi app express
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// error handler
app.use(errorHandler);

// routes
app.use("/api/users", userRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/product", productRoutes);
PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server sudah berjalan di port ${PORT}`);
});
