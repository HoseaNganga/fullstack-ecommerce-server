const mongoose = require("mongoose");

const adminSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  phone: {
    type: String,
    unique: true,
  },
  image: {
    type: String,
  },
});

exports.adminModel = mongoose.model("admin", adminSchema);
