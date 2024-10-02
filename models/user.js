const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  image: {
    type: String,
    default: "",
  },
  imagePublicId: {
    type: String,
    default: "",
  },
  password: {
    type: String,
  },
  phone: {
    type: String,
    unique: true,
  },
});

exports.userModel = mongoose.model("user", userSchema);
