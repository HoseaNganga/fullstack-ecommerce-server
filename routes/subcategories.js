const express = require("express");
const { subcategoryModel } = require("../models/subcategory");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 12;
    const totalPosts = await subcategoryModel.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);
    if (totalPages === 0) {
      return res.status(200).json({
        subCategoryList: [],
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
    let subCategoryList = [];
    if (req.query.categoryId !== undefined) {
      subCategoryList = await subcategoryModel
        .find({ category: req.query.categoryId })
        .populate("category");
    } else {
      subCategoryList = await subcategoryModel
        .find()
        .populate("category")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec();
    }

    res.status(200).json({
      subCategoryList: subCategoryList,
      totalPages: totalPages,
      page: page,
      totalPosts: totalPosts,
      perPage: perPage,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured fetching subCategory Items",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const subCategory = await subcategoryModel
      .findById(req.params.id)
      .populate("category");
    if (!subCategory) {
      return res.status(404).json({
        message: "The subcategory with the given id doesnt exist",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      subcategory: subCategory,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "An error occurred fetching the subCategory Item",
    });
  }
});

router.post("/create", async (req, res) => {
  try {
    let subcategory = new subcategoryModel({
      category: req.body.category,
      subcategory: req.body.subcategory,
    });

    subcategory = await subcategory.save();
    res.status(201).json({
      success: true,
      subcategory: subcategory,
      message: "Successfully Created Subcategory",
    });
  } catch (error) {
    console.error("Error creating subcategory:", error); // Enhanced logging
    res.status(500).json({
      success: false,
      message: "Failed to create subcategory",
    });
  }
});
router.patch("/:id", async (req, res) => {
  try {
    const subcategoryId = req.params.id;
    const subcategoryToUpdate = await subcategoryModel.findById(subcategoryId);

    if (!subcategoryToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Sub-Category not found",
      });
    }

    // Update other fields if provided
    if (req.body.category) {
      subcategoryToUpdate.category = req.body.category;
    }
    if (req.body.subcategory) {
      subcategoryToUpdate.subcategory = req.body.subcategory;
    }

    const updatedSubCategory = await subcategoryToUpdate.save();

    res.status(200).json({
      success: true,
      subcategory: updatedSubCategory,
    });
  } catch (error) {
    console.error("Error updating sub-category:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update sub-category",
    });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const subcategoryToDelete = await subcategoryModel.findById(req.params.id);

    if (!subcategoryToDelete) {
      return res.status(404).json({
        message: "sub-Category doesnt exist",
        success: false,
      });
    }

    const deletedSubCategory = await subcategoryModel.findByIdAndDelete(
      req.params.id
    );
    if (!deletedSubCategory) {
      return res.status(404).json({
        error: "Sub-Category doesn't exist",
        status: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Sub-Category deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting sub-category",
      status: false,
    });
  }
});

module.exports = router;
