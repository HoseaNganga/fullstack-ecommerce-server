const { ProductModel } = require("../models/product");
const { CategoryModel } = require("../models/category");
const express = require("express");
const router = express.Router();
const pLimit = require("p-limit");
const cloudinary = require("cloudinary").v2;

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 12;
    const totalPosts = await ProductModel.countDocuments();
    const totalPages = Math.ceil(totalPosts / perPage);
    if (totalPages === 0) {
      return res.status(200).json({
        productList: [],
        totalPages: 0,
        page: 1,
        totalPosts: 0,
        perPage: perPage,
        success: true,
      });
    }

    if (page > totalPages) {
      return res
        .status(404)
        .json({ message: "Page not found", success: false });
    }
    let productList = [];

    if (req.query.catName !== undefined) {
      productList = await ProductModel.find({
        catName: req.query.catName,
      }).populate("category subcategory productsize");
    } else if (req.query.categoryId !== undefined) {
      if (
        req.query.minPrice == undefined &&
        req.query.maxPrice == undefined &&
        req.query.rating == undefined
      ) {
        productList = await ProductModel.find({
          category: req.query.categoryId,
        }).populate("category subcategory productsize");
      } else if (
        req.query.minPrice !== undefined ||
        req.query.maxPrice !== undefined
      ) {
        let priceQuery = {};
        if (req.query.minPrice !== undefined) {
          priceQuery.$gte = parseInt(req.query.minPrice);
        }
        if (req.query.maxPrice !== undefined) {
          priceQuery.$lte = parseInt(req.query.maxPrice);
        }
        productList = await ProductModel.find({
          category: req.query.categoryId,
          newprice: priceQuery,
        }).populate("category subcategory productsize");
      } else if (req.query.rating !== undefined) {
        productList = await ProductModel.find({
          category: req.query.categoryId,
          rating: parseInt(req.query.rating),
        }).populate("category subcategory productsize");
      }
    } else if (req.query.subcategoryId !== undefined) {
      if (
        req.query.minPrice == undefined &&
        req.query.maxPrice == undefined &&
        req.query.rating == undefined
      ) {
        productList = await ProductModel.find({
          subcategory: req.query.subcategoryId,
        }).populate("category subcategory productsize");
      } else if (
        req.query.minPrice !== undefined ||
        req.query.maxPrice !== undefined
      ) {
        let priceQuery = {};
        if (req.query.minPrice !== undefined) {
          priceQuery.$gte = parseInt(req.query.minPrice);
        }
        if (req.query.maxPrice !== undefined) {
          priceQuery.$lte = parseInt(req.query.maxPrice);
        }
        productList = await ProductModel.find({
          subcategory: req.query.subcategoryId,
          newprice: priceQuery,
        }).populate("category subcategory productsize");
      } else if (req.query.rating !== undefined) {
        productList = await ProductModel.find({
          subcategory: req.query.subcategoryId,
          rating: parseInt(req.query.rating),
        }).populate("category subcategory productsize");
      }
    } else {
      productList = await ProductModel.find()
        .populate("category subcategory productsize")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .exec();
    }

    return res.status(200).json({
      productList: productList,
      totalPages: totalPages,
      page: page,
      totalPosts: totalPosts,
      perPage: perPage,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured fetching the productList",
    });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const productList = await ProductModel.find({
      isFeatured: true,
    }).populate("category subcategory productsize");
    return res.status(200).json({
      productList: productList,
      success: true,
      message: "Successfully fetched productItem",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured fetching the featured products",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const productItem = await ProductModel.findById(req.params.id).populate(
      "category subcategory productsize"
    );
    if (!productItem) {
      return res.status(404).json({
        message: "The product doesnt exist",
        success: false,
      });
    }
    res.status(200).json({
      productItem: productItem,
      success: true,
      message: "Successfully fetched the product item",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "An error occured fetching the product item",
    });
  }
});

router.post("/create", async (req, res) => {
  const {
    name,
    description,
    brand,
    oldprice,
    newprice,
    category,
    catName,
    subcategory,
    countInStock,
    discount,
    productWeight,
    rating,
    productsize,
    color,
    isFeatured,
  } = req.body;
  const images = req.files;
  if (!images || images.length === 0) {
    return res
      .status(400)
      .json({ message: "No images uploaded", success: false });
  }
  const productCategory = await CategoryModel.findById(category);
  if (!productCategory) {
    return res.status(400).json({
      success: false,
      message: "The category to edit to doesnt exist",
    });
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

    const product = new ProductModel({
      name: name,
      description: description,
      images: imageUrls,
      brand: brand,
      oldprice: oldprice,
      newprice: newprice,
      productsize: productsize,
      color: color,
      category: category,
      subcategory: subcategory,
      countInStock: countInStock,
      rating: rating,
      isFeatured: isFeatured,
      imagePublicId: imagePublicIds,
      discount: discount,
      productWeight: productWeight,
      catName: catName,
    });

    await product.save();

    res.status(201).json({
      product: product,
      success: true,
      message: "Successfully created product item",
    });
  } catch (error) {
    console.error("Error creating Product:", error); // Enhanced logging
    res.status(500).json({
      success: false,
      message: "Failed to create Product",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const productToUpdate = await ProductModel.findById(productId);

    if (!productToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Product with the given id doesn't exist",
      });
    }

    const existingImages = productToUpdate.images || []; // Existing images in DB
    const existingPublicIds = productToUpdate.imagePublicId || []; // Existing public IDs
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
      productToUpdate.images = newImages;
      productToUpdate.imagePublicId = existingPublicIds;
    }

    // Update other fields if provided
    productToUpdate.name = req.body.name || productToUpdate.name;
    productToUpdate.description =
      req.body.description || productToUpdate.description;
    productToUpdate.brand = req.body.brand || productToUpdate.brand;
    productToUpdate.oldprice = req.body.oldprice || productToUpdate.oldprice;
    productToUpdate.newprice = req.body.newprice || productToUpdate.newprice;
    productToUpdate.countInStock =
      req.body.countInStock || productToUpdate.countInStock;
    productToUpdate.rating = req.body.rating || productToUpdate.rating;
    productToUpdate.color = req.body.color || productToUpdate.color;
    productToUpdate.productsize =
      req.body.productsize || productToUpdate.productsize;
    productToUpdate.isFeatured =
      req.body.isFeatured || productToUpdate.isFeatured;
    productToUpdate.category = req.body.category || productToUpdate.category;
    productToUpdate.subcategory =
      req.body.subcategory || productToUpdate.subcategory;
    productToUpdate.discount = req.body.discount || productToUpdate.discount;
    productToUpdate.productWeight =
      req.body.productWeight || productToUpdate.productWeight;
    productToUpdate.catName = req.body.catName || productToUpdate.catName;

    const updatedProduct = await productToUpdate.save();

    res.status(200).json({
      success: true,
      product: updatedProduct,
      message: "Successfully updated Product Item",
    });
  } catch (error) {
    console.error("Error updating product:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const productToDelete = await ProductModel.findById(req.params.id);

    if (!productToDelete) {
      res.status(404).json({
        message: "Product doesnt exist",
        success: false,
      });
    }

    // Delete images from Cloudinary
    if (productToDelete.imagePublicId.length > 0) {
      await Promise.all(
        productToDelete.imagePublicId.map((publicId) =>
          cloudinary.uploader.destroy(publicId)
        )
      );
    }

    const deletedProduct = await ProductModel.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({
        error: "The product doesn't exist",
        status: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error deleting product",
      status: false,
    });
  }
});

module.exports = router;
