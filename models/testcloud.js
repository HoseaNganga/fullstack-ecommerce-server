const mongoose = require("mongoose");

const testSchema = mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
    unique: true,
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
});

exports.testProdModel = mongoose.model("testprod", testSchema);
