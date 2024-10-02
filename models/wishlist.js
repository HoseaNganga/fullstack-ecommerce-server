const mongoose = require("mongoose");

const wishList = mongoose.Schema({
  productName: {
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
  rating: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    default: 0,
  },
  productId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  productSize: {
    type: String,
    default: "",
  },
  productColor: {
    type: String,
    default: "",
  },
});

exports.WishListModel = mongoose.model("wishlist", wishList);
