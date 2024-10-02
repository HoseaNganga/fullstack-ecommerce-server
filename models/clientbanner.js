const mongoose = require("mongoose");

const bannerSchema = mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },

    imagePublicId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

exports.bannerModel = mongoose.model("bannerimg", bannerSchema);
