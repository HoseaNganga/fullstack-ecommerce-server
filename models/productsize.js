const mongoose = require("mongoose");

const productSizeSchema = mongoose.Schema({
  productsize: {
    type: String,
    default: null,
  },
});

exports.ProductSizeModel = mongoose.model("productsize", productSizeSchema);
