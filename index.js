const express = require("express");
const app = express();
//const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
require("dotenv/config");
const authJwt = require("./helper/jwt");

//cors options
const corsOptions = {
  origin: '*', 
  methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS', 
  allowedHeaders: 'Content-Type,Authorization' 
};

app.use(cors(corsOptions));
app.options("*", cors());

//MIDDLEWARE
//app.use(bodyParser.json());
app.use(express.json());
//app.use(authJwt());

// Middleware to parse URL-encoded bodies (from HTML forms)
app.use(express.urlencoded({ extended: true }));

// Configure Multer to accept all fields
const upload = multer();

// Global Middleware for handling multipart/form-data
app.use(upload.any()); // Accepts any fields in the request

//ROUTES
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/product");
const subcategoryRoutes = require("./routes/subcategories");
const productSizeRoutes = require(`./routes/productsize`);
const userRoutes = require(`./routes/user`);
const cartRoutes = require("./routes/cart");
const productReviewRoutes = require(`./routes/productReview`);
const wishListRoutes = require(`./routes/wishlist`);
const orderRoutes = require(`./routes/orders`);
const checkoutRoute = require(`./routes/checkout`);
const adminRoute = require(`./routes/admin`);
const bannerRoute = require(`./routes/clientbanner`);
const searchRoute = require(`./routes/search`);
const testRoute = require("./routes/testcloud");

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/subcategories", subcategoryRoutes);
app.use(`/api/productsize`, productSizeRoutes);
app.use(`/api/user`, userRoutes);
app.use(`/api/cart`, cartRoutes);
app.use(`/api/reviews`, productReviewRoutes);
app.use(`/api/mywishlist`, wishListRoutes);
app.use(`/api/orders`, orderRoutes);
app.use(`/api/checkout`, checkoutRoute);
app.use(`/api/admin`, adminRoute);
app.use(`/api/banner`, bannerRoute);
app.use(`/api/search`, searchRoute);
app.use(`/api/test`, testRoute);

//DATABASE
mongoose
  .connect(process.env.CONNECTION_STRING, {})
  .then(() => {
    console.log("Database Connection is ready");
    //Server
    app.listen(process.env.PORT, () => {
      console.log(`Server is running at http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
