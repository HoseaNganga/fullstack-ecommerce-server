const express = require("express");
const router = express.Router();
const { ProductSizeModel } = require("../models/productsize");

router.get("/", async (req, res) => {
  try {
    const productSizeList = await ProductSizeModel.find();

    return res.status(200).json({
      success: true,
      productSizeList: productSizeList,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "An error occured fetching the product sizes",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const productSizeItem = await ProductSizeModel.findById(req.params.id);
    if (!productSizeItem) {
      return res.status(404).json({
        message: "The product size doesnt exist",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      productSizeItem: productSizeItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured fetching the product size",
    });
  }
});

router.post("/create", async (req, res) => {
  try {
    let productsize = new ProductSizeModel({
      productsize: req.body.productsize,
    });

    productsize = await productsize.save();

    res.status(201).json({ success: true, productsize: productsize });
  } catch (error) {
    console.error("Error creating ProductSize:", error); // Enhanced logging
    res.status(500).json({
      success: false,
      message: "Failed to create ProductSize",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const productSizeToUpdate = await ProductSizeModel.findById(productId);
    if (!productSizeToUpdate) {
      return res.status(404).json({
        success: false,
        message: "ProductSize not found",
      });
    }

    // Update other fields if provided
    if (req.body.productsize)
      productSizeToUpdate.productsize = req.body.productsize;

    const updatedProductSize = await productSizeToUpdate.save();

    res.status(200).json({
      success: true,
      product: updatedProductSize,
    });
  } catch (error) {
    console.error("Error updating productSize:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update productSize",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const productSizeToDelete = await ProductSizeModel.findById(req.params.id);

    if (!productSizeToDelete) {
      res.status(404).json({
        message: "Product Size doesnt exist",
        success: false,
      });
    }

    const deletedProductSize = await ProductSizeModel.findByIdAndDelete(
      req.params.id
    );
    if (!deletedProductSize) {
      return res.status(500).json({
        error: "Error deleting product Size",
        success: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Product Size  deleted",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error deleting product Size",
      success: false,
    });
  }
});

module.exports = router;
