const { CategoryModel } = require("../models/category");
const express = require("express");
const router = express.Router();
const pLimit = require("p-limit");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 12;
    const totalPosts = await CategoryModel.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);
    if (totalPages === 0) {
      return res.status(200).json({
        categoryList: [],
        totalPages: 0,
        page: 1,
        totalPosts: 0,
        perPage: perPage,
      });
    }

    if (page > totalPages) {
      return res
        .status(404)
        .json({ message: "Page not found", success: false });
    }

    const categoryList = await CategoryModel.find()
      .skip((page - 1) * perPage)
      .limit(perPage)
      .exec();

    return res.status(200).json({
      categoryList: categoryList,
      totalPages: totalPages,
      page: page,
      totalPosts: totalPosts,
      perPage: perPage,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured fetching the Category List",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const category = await CategoryModel.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        message: "The category with the given id doesnt exist",
        success: false,
      });
    }
    return res.status(200).send({
      category: category,
      message: "Successfully Fetched CatgeoryItem",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching the Category",
      success: false,
    });
  }
});

router.post("/create", async (req, res) => {
  const { name, color } = req.body;
  const images = req.files;
  if (!images || images.length === 0) {
    return res
      .status(400)
      .json({ message: "No images uploaded", success: false });
  }
  try {
    // Upload each image to Cloudinary
    const uploadResults = await Promise.all(
      images.map(async (image) => {
        // Convert image buffer to Base64
        const base64Image = image.buffer.toString("base64");
        const result = await cloudinary.uploader.upload(
          `data:${image.mimetype};base64,${base64Image}`
        );
        return {
          url: result.secure_url,
          publicId: result.public_id,
        };
      })
    );

    // Extract URLs and public IDs from the result
    const imageUrls = uploadResults.map((result) => result.url);
    const imagePublicIds = uploadResults.map((result) => result.publicId);

    const newCategory = new CategoryModel({
      name,
      color,
      images: imageUrls,
      imagePublicId: imagePublicIds,
    });
    //Save new Category To DataBase
    await newCategory.save();

    // Send response
    res.status(201).json({
      message: "Category Successfully Created in DataBase",
      category: newCategory,
      success: true,
    });
  } catch (error) {
    console.error("Error creating category:", error); // Enhanced logging
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categoryToUpdate = await CategoryModel.findById(categoryId);

    if (!categoryToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Category with the given id doesn't exist",
      });
    }

    const existingImages = categoryToUpdate.images || []; // Existing images in DB
    const existingPublicIds = categoryToUpdate.imagePublicId || []; // Existing public IDs
    const newImages = req.body.images || []; // URLs sent from the frontend (remaining images)
    const publicIdsToDelete = []; // Track public IDs to delete from Cloudinary

    // Handle new image uploads (if any)
    if (req.files && req.files.length > 0) {
      const uploadResults = await Promise.all(
        req.files.map(async (image) => {
          const base64Image = image.buffer.toString("base64");
          const result = await cloudinary.uploader.upload(
            `data:${image.mimetype};base64,${base64Image}`
          );
          return {
            url: result.secure_url,
            publicId: result.public_id,
          };
        })
      );

      // Add the new images and their public IDs
      uploadResults.forEach(({ url, publicId }) => {
        newImages.push(url); // Add new image URL to the array
        existingPublicIds.push(publicId); // Keep the corresponding public ID
      });
    }

    // Check for images to delete if newImages has been modified
    if (newImages.length > 0) {
      existingImages.forEach((existingImage, index) => {
        if (!newImages.includes(existingImage)) {
          publicIdsToDelete.push(existingPublicIds[index]); // Keep track of the public ID to delete
        }
      });

      // Delete images from Cloudinary that are no longer needed
      await Promise.all(
        publicIdsToDelete.map(async (publicId) => {
          await cloudinary.uploader.destroy(publicId);
        })
      );

      // Update the images and public ID fields only if they have changed
      categoryToUpdate.images = newImages;
      categoryToUpdate.imagePublicId = existingPublicIds;
    }

    // Update other fields (name, color)
    categoryToUpdate.name = req.body.name || categoryToUpdate.name;
    categoryToUpdate.color = req.body.color || categoryToUpdate.color;

    // Save the updated category
    await categoryToUpdate.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: categoryToUpdate,
    });
  } catch (error) {
    console.error("Error updating category:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const categoryToDelete = await CategoryModel.findById(req.params.id);

    if (!categoryToDelete) {
      res.status(404).json({
        message: "Category doesnt exist",
        success: false,
      });
    }

    // Delete images from Cloudinary
    if (categoryToDelete.imagePublicId.length > 0) {
      await Promise.all(
        categoryToDelete.imagePublicId.map((publicId) =>
          cloudinary.uploader.destroy(publicId)
        )
      );
    }

    const deletedCategory = await CategoryModel.findByIdAndDelete(
      req.params.id
    );
    if (!deletedCategory) {
      return res.status(500).json({
        message: "Error deleting category",
        success: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Category deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting category",
      success: false,
    });
  }
});

module.exports = router;

/*  */
