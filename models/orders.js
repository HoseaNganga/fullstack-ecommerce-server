const mongoose = require("mongoose");

const ordersList = mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true, // Ensure orderId is unique
    },
    userId: {
      type: String,
      required: true,
    },
    products: [
      {
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
        productSize: {
          type: String,
          default: "",
        },
        productColor: {
          type: String,
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

exports.ordersListModel = mongoose.model("orderlist", ordersList);
