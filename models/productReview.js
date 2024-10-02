const mongoose = require("mongoose");

const reviewSchema = mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      default: "",
    },
    customerName: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
      required: true,
      default: "",
    },

    review: {
      type: String,
      required: true,
      default: "",
    },

    rating: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

exports.productReviewModel = mongoose.model("productreview", reviewSchema);
