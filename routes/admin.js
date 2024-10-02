const express = require("express");
const router = express.Router();
const pLimit = require("p-limit");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { adminModel } = require("../models/admin");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

router.post(`/signup`, async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const existingAdmin = await adminModel.findOne({ email: email });
    const existingAdminByPhone = await adminModel.findOne({ phone: phone });
    if (existingAdmin || existingAdminByPhone) {
      return res.status(400).json({
        message: "Admin already exists..Check email or phone",
        success: false,
        status: false,
      });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newAdmin = await adminModel.create({
      name: name,
      email: email,
      password: hashPassword,
      phone: phone,
    });
    const token = jwt.sign(
      { email: newAdmin.email, id: newAdmin._id },
      process.env.JSON_WEB_TOKEN_SECRET_KEY
    );
    res.status(200).json({
      admin: newAdmin,
      token: token,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Couldn`t create a  new Admin", success: false });
  }
});

router.post(`/signin`, async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingAdmin = await adminModel.findOne({ email: email });
    if (!existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin doesnt exist", success: false });
    }
    const matchPassword = await bcrypt.compare(
      password,
      existingAdmin.password
    );

    if (!matchPassword) {
      return res
        .status(400)
        .json({ message: "Invalid Password Credentials", success: false });
    }
    const token = jwt.sign(
      { email: existingAdmin.email, id: existingAdmin._id },
      process.env.JSON_WEB_TOKEN_SECRET_KEY
    );
    res.status(200).json({
      admin: existingAdmin,
      token: token,
      message: "Admin succesfully Authenticated",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Couldn`t fetch existing Admin Credentials",
      success: false,
    });
  }
});

router.post(`/authWithGoogle`, async (req, res) => {
  const { name, email, password, phone, image } = req.body;

  try {
    const existingAdmin = await adminModel.findOne({ email: email });
    if (!existingAdmin) {
      const result = await adminModel.create({
        name: name,
        email: email,
        phone: phone,
        password: password,
        image: image,
      });
      const token = jwt.sign(
        { email: result.email, id: result._id },
        process.env.JSON_WEB_TOKEN_SECRET_KEY
      );
      res.status(200).json({
        admin: result,
        token: token,
        success: true,
      });
    } else {
      const existingAdmin = await adminModel.findOne({ email: email });
      const token = jwt.sign(
        { email: existingAdmin.email, id: existingAdmin._id },
        process.env.JSON_WEB_TOKEN_SECRET_KEY
      );
      res.status(200).json({
        admin: existingAdmin,
        token: token,
        success: true,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Couldn`t create a  new Admin", success: false });
  }
});

router.get("/", async (req, res) => {
  try {
    const adminList = await adminModel.find();
    if (!adminList) {
      return res
        .status(500)
        .json({ success: false, message: "No Admins found", success: false });
    }
    res.status(200).json({
      success: true,
      adminList: adminList,
    });
  } catch (error) {
    console.error("Error fetching admin list:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the admin list",
    });
  }
});

router.get(`/:id`, async (req, res) => {
  try {
    const admin = await adminModel.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({
        message: "No such Admin Exists",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      admin: admin,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching admin list:", error);
    res.status(404).json({
      success: false,
      message: "An error occurred while fetching the admin",
    });
  }
});
router.delete(`/:id`, async (req, res) => {
  try {
    const adminToDelete = await adminModel.findById(req.params.id);
    if (!adminToDelete) {
      return res.status(404).json({
        message: "Admin doesnt exist",
        success: false,
      });
    }
    const deletedAdmin = await adminModel.findByIdAndDelete(req.params.id);
    if (!deletedAdmin) {
      return res.status(500).json({
        error: "Error deleting Admin",
        success: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Admin successfully deleted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Error deleting Admin",
      success: false,
    });
  }
});

router.get("/get/count", async (req, res) => {
  try {
    const adminCount = await adminModel.countDocuments();
    if (!adminCount) {
      return res
        .status(500)
        .json({ success: false, message: "No admin found", success: false });
    }
    res.status(200).json({
      success: true,
      adminCount: adminCount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "No admin found" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const image = req.files[0];
    const { name, email, password, phone, oldpassword } = req.body;
    const userToUpdate = await adminModel.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    let existingImage = userToUpdate.image || ""; // Existing image in DB
    let existingPublicId = userToUpdate.imagePublicId || ""; // Existing public ID
    let newImage = ""; // URL sent from the frontend
    let newPublicId = "";

    if (image) {
      // If there's an existing image, delete it from Cloudinary
      if (existingPublicId) {
        await cloudinary.uploader.destroy(existingPublicId);
      }

      // Convert image buffer to Base64
      const base64Image = image.buffer.toString("base64");

      // Upload the new image to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${image.mimetype};base64,${base64Image}`
      );
      newImage = result.secure_url;
      newPublicId = result.public_id;
    } else {
      // If no new image is uploaded, keep the existing image and public ID
      newImage = existingImage;
      newPublicId = existingPublicId;
    }

    let newPassword;
    if (oldpassword && password) {
      const matchPassword = await bcrypt.compare(
        oldpassword,
        userToUpdate.password
      );

      if (!matchPassword) {
        return res
          .status(400)
          .json({ message: "Invalid Password Credentials", success: false });
      }

      newPassword = await bcrypt.hash(password, 10);
    }

    const updatedData = {
      name: name,
      email: email,
      phone: phone,
      image: newImage,
      imagePublicId: newPublicId,
    };

    if (newPassword) {
      updatedData.password = newPassword;
    }

    const updatedUser = await adminModel.findByIdAndUpdate(
      req.params.id,
      updatedData,

      {
        new: true,
      }
    );
    res.status(200).json({
      success: true,
      admin: updatedUser,
    });
  } catch (error) {
    console.error("Error updating Admin:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update Admin",
      error: error.message,
    });
  }
});

module.exports = router;
