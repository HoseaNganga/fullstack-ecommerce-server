const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const pLimit = require("p-limit");
const { ordersListModel } = require("../models/orders");
const { v4: uuidv4 } = require("uuid"); // Import the uuid function

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
});

router.post(`/create`, async (req, res) => {
  try {
    const { userId, products } = req.body;

    // Generate a unique orderId
    const orderId = uuidv4();

    // Initialize concurrency limit for image uploads
    const limit = pLimit(2);

    // Process each product's images
    const updatedOrderProducts = await Promise.all(
      products.map(async (product) => {
        const {
          productName,
          images,
          rating,
          price,
          quantity,
          subtotal,
          productId,
          productSize,
          productColor,
        } = product;

        // Validate required product fields
        if (!productName || !productId || !Array.isArray(images)) {
          throw new Error(
            "Missing required fields in one of the order products"
          );
        }

        // Upload images to Cloudinary with concurrency limit
        const uploadPromises = images.map((image) =>
          limit(() => cloudinary.uploader.upload(image))
        );

        const uploadResults = await Promise.all(uploadPromises);

        // Extract URLs and Public IDs from upload results
        const imgurl = uploadResults.map((result) => result.secure_url);
        const imgPublicId = uploadResults.map((result) => result.public_id);

        // Return the updated product with image URLs and Public IDs
        return {
          productName,
          images: imgurl,
          imagePublicId: imgPublicId,
          rating,
          price,
          quantity,
          subtotal,
          productId,
          productSize,
          productColor,
        };
      })
    );

    // Create the new order with updated orderProducts
    const orderList = new ordersListModel({
      orderId,
      userId,
      products: updatedOrderProducts,
    });

    // Save the order to the database
    const savedOrder = await orderList.save();

    // Respond with the saved order
    res.status(201).json({
      orderList: savedOrder,
      success: true,
    });
  } catch (error) {
    console.error("Error creating OrderList:", error); // Enhanced logging
    res.status(500).json({
      success: false,
      message: "Failed to create order List",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const { userId, orderId } = req.query; // Extract userId and orderId from the query parameters

    // Initialize an empty query object
    let query = {};

    // Check for userId and/or orderId and add to the query object
    if (userId) {
      query.userId = userId; // Add userId to the query if provided
    }

    if (orderId) {
      query.orderId = orderId; // Add orderId to the query if provided
    }

    // Fetch orders based on the constructed query object
    const orderList = await ordersListModel.find(query);

    // Check if orderList is empty
    if (orderList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No order items found for the given criteria",
      });
    }

    // Return the orderList
    res.status(200).json({
      success: true,
      orderList: orderList,
    });
  } catch (error) {
    console.error("Error fetching order items:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the order items",
    });
  }
});

router.get(`/:id`, async (req, res) => {
  try {
    const order = await ordersListModel.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        message: "No such Order Exists",
        success: false,
      });
    }
    res.status(200).json({
      success: true,
      orderList: order,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching order list:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the order",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    // Find the order item by ID
    const orderItemToDelete = await ordersListModel.findById(req.params.id);

    if (!orderItemToDelete) {
      return res.status(404).json({
        message: "Order Item doesn't exist",
        success: false,
      });
    }

    // Iterate over the orderProducts array and delete associated Cloudinary images
    const productImageDeletions = orderItemToDelete.products.map((product) => {
      if (
        Array.isArray(product.imagePublicId) &&
        product.imagePublicId.length > 0
      ) {
        // Use Promise.all to handle asynchronous deletions for each product
        return Promise.all(
          product.imagePublicId.map((publicId) => {
            return cloudinary.uploader.destroy(publicId);
          })
        );
      }
    });

    // Wait for all image deletions to complete
    await Promise.all(productImageDeletions);

    // Delete the order item from the database
    const deletedOrderItem = await ordersListModel.findByIdAndDelete(
      req.params.id
    );

    if (!deletedOrderItem) {
      return res.status(500).json({
        error: "Error deleting Order Item from the database",
        success: false,
      });
    }

    // Respond with success if deletion was successful
    res.status(200).json({
      success: true,
      message: "Order Item and associated images deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Order Item:", error); // Log the error for debugging
    res.status(500).json({
      error: "Error deleting Order Item",
      success: false,
    });
  }
});

module.exports = router;
