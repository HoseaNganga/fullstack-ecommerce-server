const express = require("express");
const router = express.Router();
const pLimit = require("p-limit");
const { userModel } = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

router.post(`/signup`, async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const existingUser = await userModel.findOne({ email: email });
    const existingUserByPhone = await userModel.findOne({ phone: phone });
    if (existingUser || existingUserByPhone) {
      return res.status(400).json({
        message: "User already exists..Check email or phone",
        success: false,
        status: false,
      });
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.create({
      name: name,
      email: email,
      password: hashPassword,
      phone: phone,
    });
    const token = jwt.sign(
      { email: newUser.email, id: newUser._id },
      process.env.JSON_WEB_TOKEN_SECRET_KEY
    );
    res.status(200).json({
      user: newUser,
      token: token,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Couldn`t create a  new User", success: false });
  }
});

router.post(`/signin`, async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      return res
        .status(400)
        .json({ message: "User doesnt exist", success: false });
    }
    const matchPassword = await bcrypt.compare(password, existingUser.password);

    if (!matchPassword) {
      return res
        .status(400)
        .json({ message: "Invalid Password Credentials", success: false });
    }
    const token = jwt.sign(
      { email: existingUser.email, id: existingUser._id },
      process.env.JSON_WEB_TOKEN_SECRET_KEY
    );
    res.status(200).json({
      user: existingUser,
      token: token,
      message: "User succesfully Authenticated",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Couldn`t fetch existing User Credentials",
      success: false,
    });
  }
});

router.post(`/authWithGoogle`, async (req, res) => {
  const { name, email, password, phone, image } = req.body;

  try {
    const existingUser = await userModel.findOne({ email: email });
    if (!existingUser) {
      const result = await userModel.create({
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
        user: result,
        token: token,
        success: true,
      });
    } else {
      const existingUser = await userModel.findOne({ email: email });
      const token = jwt.sign(
        { email: existingUser.email, id: existingUser._id },
        process.env.JSON_WEB_TOKEN_SECRET_KEY
      );
      res.status(200).json({
        user: existingUser,
        token: token,
        success: true,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Couldn`t create a  new User", success: false });
  }
});

router.get("/", async (req, res) => {
  try {
    const userList = await userModel.find();
    if (!userList) {
      return res
        .status(500)
        .json({ success: false, message: "No users found", success: false });
    }
    res.status(200).json({
      success: true,
      userList: userList,
    });
  } catch (error) {
    console.error("Error fetching user list:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the user list",
    });
  }
});

router.get(`/:id`, async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        message: "No such User Exists",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      user: user,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching user list:", error);
    res.status(404).json({
      success: false,
      message: "An error occurred while fetching the user",
    });
  }
});
router.delete(`/:id`, async (req, res) => {
  try {
    const userToDelete = await userModel.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({
        message: "User doesnt exist",
        success: false,
      });
    }

    // Delete the image from Cloudinary (single imagePublicId, not array)
    if (userToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(userToDelete.imagePublicId);
    }

    const deletedUser = await userModel.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(500).json({
        error: "Error deleting User",
        success: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "User successfully deleted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Error deleting User",
      success: false,
    });
  }
});

router.get("/get/count", async (req, res) => {
  try {
    const userCount = await userModel.countDocuments();
    if (!userCount) {
      return res
        .status(500)
        .json({ success: false, message: "No users found", success: false });
    }
    res.status(200).json({
      success: true,
      userCount: userCount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "No users found" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const image = req.files[0];
    const { name, email, password, phone, oldpassword } = req.body;
    const userToUpdate = await userModel.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
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

    const updatedUser = await userModel.findByIdAndUpdate(
      req.params.id,
      updatedData,

      {
        new: true,
      }
    );
    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating User:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update User",
      error: error.message,
    });
  }
});
module.exports = router;
