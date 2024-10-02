const express = require("express");
const router = express.Router();
const { CartModel } = require("../models/cart");
const cloudinary = require("cloudinary").v2;
const pLimit = require("p-limit");

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

router.post(`/add`, async (req, res) => {
  try {
    // Use findOne to check if the cart item already exists
    const existingCartItem = await CartModel.findOne({
      productId: req.body.productId,
      userId: req.body.userId,
    });

    if (existingCartItem) {
      return res.status(400).json({
        message: "Item already added to cart",
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

    const cartList = new CartModel({
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

    // Save the new cart item
    await cartList.save();
    res.status(200).json({
      cartList: cartList,
      success: true,
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    return res.status(500).json({
      message: "Couldn't create a cartItem",
      success: false,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const cartList = await CartModel.find(req.query);
    if (!cartList) {
      return res.status(500).json({
        success: false,
        message: "No cart items found",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      cartList: cartList,
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the cart items",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const cartItemToDelete = await CartModel.findById(req.params.id);

    if (!cartItemToDelete) {
      res.status(404).json({
        message: "Cart Item doesnt exist",
        success: false,
      });
    }

    if (cartItemToDelete.imagePublicId.length > 0) {
      cartItemToDelete.imagePublicId.forEach((publicId) => {
        cloudinary.uploader.destroy(publicId);
      });
    }

    const deletedCartItem = await CartModel.findByIdAndDelete(req.params.id);
    if (!deletedCartItem) {
      return res.status(500).json({
        error: "Error deleting cart Item",
        status: false,
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart Item deleted",
    });
  } catch (error) {
    res.status(500).json({
      error: "Error deleting cart Item",
      status: false,
    });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const cartId = await req.params.id;
    const cartItemToUpdate = await CartModel.findById(cartId);

    if (!cartItemToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Cart Item  not found",
      });
    }

    if (req.body.images && req.body.images.length > 0) {
      let newImages = req.body.images || [];
      let existingImages = cartItemToUpdate.images || [];
      let existingImagePublicIds = cartItemToUpdate.imagePublicId || [];

      // Find images to delete
      const imagesToDelete = existingImages.filter(
        (image) => !newImages.includes(image)
      );
      let publicIdsToDelete = [];

      // Delete images from Cloudinary
      if (imagesToDelete.length > 0) {
        publicIdsToDelete = existingImagePublicIds.filter((publicId) =>
          imagesToDelete.includes(
            cartItemToUpdate.images[existingImagePublicIds.indexOf(publicId)]
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

      cartItemToUpdate.images = [
        ...existingImages.filter((img) => !imagesToDelete.includes(img)),
        ...uploadedUrls,
      ];
      cartItemToUpdate.imagePublicId = [
        ...existingImagePublicIds.filter(
          (id) => !publicIdsToDelete.includes(id)
        ),
        ...uploadedPublicIds,
      ];
    }

    // Update other fields if provided
    if (req.body.productName) {
      cartItemToUpdate.productName = req.body.productName;
    }
    if (req.body.rating) {
      cartItemToUpdate.rating = req.body.rating;
    }
    if (req.body.price) {
      cartItemToUpdate.price = req.body.price;
    }
    if (req.body.quantity) {
      cartItemToUpdate.quantity = req.body.quantity;
    }
    if (req.body.subtotal) {
      cartItemToUpdate.subtotal = req.body.subtotal;
    }
    if (req.body.productSize) {
      cartItemToUpdate.productSize = req.body.productSize;
    }
    if (req.body.productColor) {
      cartItemToUpdate.productColor = req.body.productColor;
    }
    const updatedCartItem = await cartItemToUpdate.save();

    res.status(200).json({
      success: true,
      cartList: updatedCartItem,
    });
  } catch (error) {
    console.error("Error updating cartItem:", error); // Log the error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to update cartItem",
      error: error.message,
    });
  }
});

router.get("/get/count", async (req, res) => {
  const { userId } = await req.query; // Assume the user ID is passed as a query parameter
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is required" });
  }

  try {
    const cartCount = await CartModel.countDocuments({ userId: userId });
    res.status(200).json({
      success: true,
      cartCount: cartCount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "No cart Items found" });
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

    // Find all cart items for the user
    const cartItems = await CartModel.find({ userId: userId });

    if (cartItems.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No cart items found for the user",
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
    await CartModel.deleteMany({ userId: userId });

    res.status(200).json({
      success: true,
      message:
        "All cart items and associated images for the user have been cleared",
    });
  } catch (error) {
    console.error("Error clearing cart items:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while clearing the cart items",
    });
  }
});

module.exports = router;
