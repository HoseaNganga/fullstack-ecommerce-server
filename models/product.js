const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    imagePublicId: [
      {
        type: String,
        required: true,
      },
    ],
    brand: {
      type: String,
      default: "",
    },
    oldprice: {
      type: Number,
      default: 0,
    },
    newprice: {
      type: Number,
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      required: true,
    },
    catName: {
      type: String,
      default: "",
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subcategory",
      required: true,
    },
    countInStock: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    productWeight: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    productsize: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "productsize",
        default: null,
      },
    ],
    color: [
      {
        type: String,
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

exports.ProductModel = mongoose.model("product", productSchema);
