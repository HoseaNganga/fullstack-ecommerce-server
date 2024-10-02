const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const pLimit = require("p-limit");
const { WishListModel } = require("../models/wishlist");

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

router.post(`/add`, async (req, res) => {
  try {
    // Use findOne to check if the wish item already exists
    const existingWishItem = await WishListModel.findOne({
      productId: req.body.productId,
      userId: req.body.userId,
    });

    if (existingWishItem) {
      return res.status(400).json({
        message: "Items already added to wishList",
        success: false,
      });
    }

    if (!Array.isArray(req.body.images)) {
      return res.status(400).json({
        error: "Invalid images format",
        success: false,
      });
    }

    const limit = pLimit(2);
    const imagesToUpload = req.body.images.map((image) =>
      limit(async () => {
        return await cloudinary.uploader.upload(image);
      })
    );

    const uploadStatus = await Promise.all(imagesToUpload);
    const imgurl = uploadStatus.map((item) => item.secure_url);
    const imgPublicId = uploadStatus.map((item) => item.public_id);

    const wishList = new WishListModel({
      productName: req.body.productName,
      images: imgurl,
      imagePublicId: imgPublicId,
      rating: req.body.rating,
      price: req.body.price,
      quantity: req.body.quantity,
      userId: req.body.userId,
      productId: req.body.productId,
      subtotal: req.body.subtotal,
      productSize: req.body.productSize,
      productColor: req.body.productColor,
    });

    // Save the new wish item
    await wishList.save();
    res.status(201).json({
      wishList: wishList,
      success: true,
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    return res.status(500).json({
      message: "Couldn't create a wishList",
      success: false,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const wishList = await WishListModel.find(req.query);
    if (!wishList) {
      return res.status(500).json({
        success: false,
        message: "No wishList items found",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      wishList: wishList,
    });
  } catch (error) {
    console.error("Error fetching wishlist items:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the wishlist items",
    });
  }
});

router.get(`/:id`, async (req, res) => {
  try {
    const wishItem = await WishListModel.findById(req.params.id);
    if (!wishItem) {
      return res.status(404).json({
        message: "No such Item Exists",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      wishItem: wishItem,
    });
  } catch (error) {
    console.error("Error fetching wish Item:", error);
    res.status(404).json({
      success: false,
      message: "An error occurred while fetching the wish Item",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const wishItemToDelete = await WishListModel.findById(req.params.id);

    if (!wishItemToDelete) {
      return res.status(404).json({
        message: "wish Item doesnt exist",
        success: false,
      });
    }

    if (wishItemToDelete.imagePublicId.length > 0) {
      await Promise.all(
        wishItemToDelete.imagePublicId.map((publicId) =>
          cloudinary.uploader.destroy(publicId)
        )
      );
    }

    const deletedWishItem = await WishListModel.findByIdAndDelete(
      req.params.id
    );
    if (!deletedWishItem) {
      return res.status(500).json({
        error: "Error deleting wish Item",
        status: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Wish Item deleted",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error deleting Wish Item",
      status: false,
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const wishItemId = await req.params.id;
    const wishItemToUpdate = await WishListModel.findById(wishItemId);

    if (!wishItemToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Wish Item  not found",
      });
    }

    if (req.body.images && req.body.images.length > 0) {
      let newImages = req.body.images || [];
      let existingImages = wishItemToUpdate.images || [];
      let existingImagePublicIds = wishItemToUpdate.imagePublicId || [];

      // Find images to delete
      const imagesToDelete = existingImages.filter(
        (image) => !newImages.includes(image)
      );
      let publicIdsToDelete = [];

      // Delete images from Cloudinary
      if (imagesToDelete.length > 0) {
        publicIdsToDelete = existingImagePublicIds.filter((publicId) =>
          imagesToDelete.includes(
            wishItemToUpdate.images[existingImagePublicIds.indexOf(publicId)]
          )
        );

        if (publicIdsToDelete.length > 0) {
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

      wishItemToUpdate.images = [
        ...existingImages.filter((img) => !imagesToDelete.includes(img)),
        ...uploadedUrls,
      ];
      wishItemToUpdate.imagePublicId = [
        ...existingImagePublicIds.filter(
          (id) => !publicIdsToDelete.includes(id)
        ),
        ...uploadedPublicIds,
      ];
    }

    // Update other fields if provided
    if (req.body.productName) {
      wishItemToUpdate.productName = req.body.productName;
    }
    if (req.body.rating) {
      wishItemToUpdate.rating = req.body.rating;
    }
    if (req.body.price) {
      wishItemToUpdate.price = req.body.price;
    }
    if (req.body.quantity) {
      wishItemToUpdate.quantity = req.body.quantity;
    }
    if (req.body.subtotal) {
      wishItemToUpdate.subtotal = req.body.subtotal;
    }
    if (req.body.productSize) {
      wishItemToUpdate.productSize = req.body.productSize;
    }
    if (req.body.productColor) {
      wishItemToUpdate.productColor = req.body.productColor;
    }
    const updatedWishItem = await wishItemToUpdate.save();

    res.status(200).json({
      success: true,
      wishList: updatedWishItem,
    });
  } catch (error) {
    console.error("Error updating wishItem:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update wishItem",
      error: error.message,
    });
  }
});
router.get("/get/count", async (req, res) => {
  try {
    const wishListCount = await WishListModel.countDocuments();
    res.status(200).json({
      success: true,
      wishListCount: wishListCount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "No wish Items found" });
  }
});

router.delete("/clear/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if the userId is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Find all wishListItems for the user
    const cartItems = await WishListModel.find({ userId: userId });

    if (cartItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No wishlist items found for the user",
      });
    }

    // Extract and delete all associated images from Cloudinary
    const publicIds = cartItems.flatMap((item) => item.imagePublicId); // Collect all imagePublicIds

    // Only delete if there are images to delete
    if (publicIds.length > 0) {
      await Promise.all(
        publicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
      );
    }

    // Delete all cart items for the user from the database
    await WishListModel.deleteMany({ userId: userId });

    res.status(200).json({
      success: true,
      message:
        "All wishListItems and associated images for the user have been cleared",
    });
  } catch (error) {
    console.error("Error clearing wishListItems:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while clearing the wishListItems",
    });
  }
});

module.exports = router;
