const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const { bannerModel } = require("../models/clientbanner");

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

router.post(`/create`, async (req, res) => {
  const image = req.files[0];
  if (!image) {
    return res
      .status(400)
      .json({ message: "No image uploaded", success: false });
  }
  try {
    // Convert image buffer to Base64
    const base64Image = image.buffer.toString("base64");

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${image.mimetype};base64,${base64Image}`
    );

    // Save the image URL and public ID
    const bannerImage = new bannerModel({
      image: result.secure_url, // Storing a single image URL
      imagePublicId: result.public_id, // Storing a single public ID
    });

    // Save new BannerImage To DataBase
    await bannerImage.save();

    // Send response

    res.status(201).json({
      success: true,
      bannerImage: bannerImage,
      message: "Successfully Created bannerImage",
    });
  } catch (error) {
    console.error("Error creating imageBannerImage:", error); // Enhanced logging
    res.status(500).json({
      success: false,
      message: "Failed to create bannerImage",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const bannerList = await bannerModel.find();

    // Check if orderList is empty
    if (bannerList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No banner images found",
        bannerList: [],
      });
    }

    // Return the orderList
    res.status(200).json({
      success: true,
      bannerList: bannerList,
    });
  } catch (error) {
    console.error("Error fetching banner images:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the banner images",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    // Find the banner item by ID
    const bannerItemToDelete = await bannerModel.findById(req.params.id);

    if (!bannerItemToDelete) {
      return res.status(404).json({
        message: "Banner item doesn't exist",
        success: false,
      });
    }

    // Delete the image from Cloudinary (single imagePublicId, not array)
    if (bannerItemToDelete.imagePublicId) {
      await cloudinary.uploader.destroy(bannerItemToDelete.imagePublicId);
    }

    // Delete the banner item from the database
    const deletedBannerItem = await bannerModel.findByIdAndDelete(
      req.params.id
    );

    if (!deletedBannerItem) {
      return res.status(500).json({
        error: "Error deleting banner item from the database",
        success: false,
      });
    }

    // Respond with success if deletion was successful
    res.status(200).json({
      success: true,
      message: "Banner item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting banner item:", error); // Log the error for debugging
    res.status(500).json({
      error: "Error deleting banner item",
      success: false,
    });
  }
});

module.exports = router;
