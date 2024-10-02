const mongoose = require("mongoose");

const subcategorySchema = mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true,
  },
  subcategory: {
    type: String,
    required: true,
  },
});

exports.subcategoryModel = mongoose.model("subcategory", subcategorySchema);
