const express = require("express");
const router = express.Router();
const pLimit = require("p-limit");
const { testProdModel } = require("../models/testcloud");
const cloudinary = require("cloudinary").v2;

// Route to handle product creation and image upload
/* router.post("/create", async (req, res) => {
  const { productName, description } = req.body; // Access product details from req.body
  const images = req.files; // Access uploaded images from req.files

  if (!images || images.length === 0) {
    return res.status(400).json({ message: "No images uploaded" });
  }

  try {
    // Upload each image to Cloudinary
    const uploadResults = await Promise.all(
      images.map(async (image) => {
        const result = await cloudinary.uploader.upload(image.tempFilePath); // Removed folder option
        return {
          url: result.secure_url,
          publicId: result.public_id,
        };
      })
    );

    // Extract URLs and public IDs from the result
    const imageUrls = uploadResults.map((result) => result.url);
    const imagePublicIds = uploadResults.map((result) => result.publicId);

    // Create new product in the database
    const newProduct = new testProdModel({
      productName,
      description,
      images: imageUrls,
      imagePublicId: imagePublicIds,
    });

    // Save product to the database
    await newProduct.save();

    // Send response
    res.status(201).json({ message: "Product created", prodTest: newProduct });
  } catch (error) {
    console.error("Error uploading images: ", error);
    res.status(500).json({ message: "Server error" });
  }
}); */

// Route to handle product creation and image upload
router.post("/create", async (req, res) => {
  const { productName, description } = req.body; // Access product details from req.body
  const images = req.files; // Access uploaded images from req.files

  if (!images || images.length === 0) {
    return res.status(400).json({ message: "No images uploaded" });
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

    // Create new product in the database
    const newProduct = new testProdModel({
      productName,
      description,
      images: imageUrls,
      imagePublicId: imagePublicIds,
    });

    // Save product to the database
    await newProduct.save();

    // Send response
    res.status(201).json({
      message: "Product created",
      prodTest: newProduct,
      success: true,
    });
  } catch (error) {
    console.error("Error uploading images: ", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get(`/`, async (req, res) => {
  try {
    const products = await testProdModel.find();
    return res.status(200).json({
      productList: products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get(`/:id`, async (req, res) => {
  try {
    const product = await testProdModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "The product doesnt exist",
      });
    }
    res.status(200).json({
      success: true,
      product: product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "An error has occured",
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const productToUpdate = await testProdModel.findById(productId);

    if (!productToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
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

    // Check for images to delete
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

    // Update the product in the database
    productToUpdate.productName =
      req.body.productName || productToUpdate.productName;
    productToUpdate.description =
      req.body.description || productToUpdate.description;
    productToUpdate.images = newImages; // Update with new images (URLs)
    productToUpdate.imagePublicId = existingPublicIds; // Update public IDs

    // Save the updated product
    await productToUpdate.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: productToUpdate,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the product.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const productToDelete = await testProdModel.findById(req.params.id);

    if (!productToDelete) {
      return res.status(404).json({
        message: "Product doesn't exist",
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

    // Delete the product from the database
    const deletedProduct = await testProdModel.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(500).json({
        error: "Error deleting product",
        success: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error deleting product",
      success: false,
    });
  }
});

/* router.delete("/:id", async (req, res) => {
  try {
    const productToDelete = await testProdModel.findById(req.params.id);

    if (!productToDelete) {
      res.status(404).json({
        message: "Product doesnt exist",
        success: false,
      });
    }

    if (productToDelete.imagePublicId.length > 0) {
      await Promise.all(
        productToDelete.imagePublicId.forEach((publicId) => {
          cloudinary.uploader.destroy(publicId);
        })
      );
    }

    const deletedProduct = await testProdModel.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(500).json({
        error: "Error deleting product",
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
}); */

/* router.get("/", async (req, res) => {
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
      });
    }

    if (page > totalPages) {
      return res.status(404).json({ message: "Page not found" });
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
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const productList = await ProductModel.find({
      isFeatured: true,
    }).populate("category subcategory productsize");
    return res.status(200).json({
      productList: productList,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  const productItem = await ProductModel.findById(req.params.id).populate(
    "category subcategory productsize"
  );
  if (!productItem) {
    res.status(500).json({
      message: "The product doesnt exist",
    });
  }
  res.status(200).send(productItem);
});

router.post("/create", async (req, res) => {
  try {
    const category = await CategoryModel.findById(req.body.category);
    if (!category) {
      return res.status(400).send("Invalid category");
    }
    if (!Array.isArray(req.body.images)) {
      return res.status(400).json({
        error: "Invalid images format",
        success: false,
      });
    }

    const limit = pLimit(2);
    const imagesToUpload = req.body.images.map((image) => {
      return limit(async () => {
        const result = await cloudinary.uploader.upload(image);
        return result;
      });
    });

    const uploadStatus = await Promise.all(imagesToUpload);

    const imgurl = uploadStatus.map((item) => {
      return item.secure_url;
    });
    const imgPublicId = uploadStatus.map((item) => item.public_id);

    if (!uploadStatus) {
      return res.status(500).json({
        error: "images cannot upload",
        status: false,
      });
    }
    let product = new ProductModel({
      name: req.body.name,
      description: req.body.description,
      images: imgurl,
      brand: req.body.brand,
      oldprice: req.body.oldprice,
      newprice: req.body.newprice,
      productsize: req.body.productsize,
      color: req.body.color,
      category: req.body.category,
      subcategory: req.body.subcategory,
      countInStock: req.body.countInStock,
      rating: req.body.rating,
      isFeatured: req.body.isFeatured,
      imagePublicId: imgPublicId,
      discount: req.body.discount,
      productWeight: req.body.productWeight,
      catName: req.body.catName,
    });

    product = await product.save();

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating Product:", error); // Enhanced logging
    res.status(500).json({
      success: false,
      message: "Failed to create Product",
      error: error.message,
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
        message: "Product not found",
      });
    }

    if (req.body.images && req.body.images.length > 0) {
      let newImages = req.body.images || [];
      let existingImages = productToUpdate.images || [];
      let existingImagePublicIds = productToUpdate.imagePublicId || [];

      // Find images to delete
      const imagesToDelete = existingImages.filter(
        (image) => !newImages.includes(image)
      );

      let publicIdsToDelete = [];

      // Delete images from Cloudinary
      if (imagesToDelete.length > 0) {
        publicIdsToDelete = existingImagePublicIds.filter((publicId) =>
          imagesToDelete.includes(
            productToUpdate.images[existingImagePublicIds.indexOf(publicId)]
          )
        );

        if (publicIdsToDelete.length > 0) {
          // Ensure Cloudinary deletion happens before proceeding
          await Promise.all(
            publicIdsToDelete.map((publicId) =>
              cloudinary.uploader.destroy(publicId)
            )
          );
        }
      }

      // Upload new images
      const newImageUrls = newImages.filter(
        (image) => !existingImages.includes(image)
      );
      const limit = pLimit(2);

      const imagesToUpload = newImageUrls.map((image) =>
        limit(() => cloudinary.uploader.upload(image))
      );

      const uploadStatus = await Promise.all(imagesToUpload);

      const uploadedUrls = uploadStatus.map((item) => item.secure_url);
      const uploadedPublicIds = uploadStatus.map((item) => item.public_id);

      // Update images and imagePublicId after deleting the old ones
      productToUpdate.images = [
        ...existingImages.filter((img) => !imagesToDelete.includes(img)),
        ...uploadedUrls,
      ];

      productToUpdate.imagePublicId = [
        ...existingImagePublicIds.filter(
          (id) => !publicIdsToDelete.includes(id)
        ),
        ...uploadedPublicIds,
      ];
    }

    // Update other fields if provided
    if (req.body.name) productToUpdate.name = req.body.name;
    if (req.body.description)
      productToUpdate.description = req.body.description;
    if (req.body.brand) productToUpdate.brand = req.body.brand;
    if (req.body.oldprice) productToUpdate.oldprice = req.body.oldprice;
    if (req.body.newprice) productToUpdate.newprice = req.body.newprice;
    if (req.body.countInStock)
      productToUpdate.countInStock = req.body.countInStock;
    if (req.body.rating) productToUpdate.rating = req.body.rating;
    if (req.body.color) productToUpdate.color = req.body.color;
    if (req.body.productsize)
      productToUpdate.productsize = req.body.productsize;
    if (req.body.isFeatured) productToUpdate.isFeatured = req.body.isFeatured;
    if (req.body.category) productToUpdate.category = req.body.category;
    if (req.body.subcategory)
      productToUpdate.subcategory = req.body.subcategory;
    if (req.body.discount) productToUpdate.discount = req.body.discount;
    if (req.body.productWeight)
      productToUpdate.productWeight = req.body.productWeight;
    if (req.body.catName) productToUpdate.catName = req.body.catName;

    const updatedProduct = await productToUpdate.save();

    res.status(200).json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
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

    if (productToDelete.imagePublicId.length > 0) {
      productToDelete.imagePublicId.forEach((publicId) => {
        cloudinary.uploader.destroy(publicId);
      });
    }

    const deletedProduct = await ProductModel.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(500).json({
        error: "Error deleting product",
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
}); */

module.exports = router;
