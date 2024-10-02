const express = require("express");
const router = express.Router();
const { productReviewModel } = require("../models/productReview");

router.get(`/`, async (req, res) => {
  let productReviews = [];
  try {
    if (
      req.query.productId !== undefined &&
      req.query.productId !== null &&
      req.query.productId !== ""
    ) {
      productReviews = await productReviewModel.find({
        productId: req.query.productId,
      });
    } else {
      productReviews = await productReviewModel.find();
    }
    if (productReviews.length === 0) {
      return res.status(200).json({
        message: "No productReviews found",
        success: true,
        productReviews: [],
      });
    }
    res.status(200).json({
      success: true,
      productReviews: productReviews,
    });
  } catch (error) {
    console.error("Error fetching product Review:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching product items",
    });
  }
});

router.get(`/:id`, async (req, res) => {
  try {
    const reviewToFind = await productReviewModel.findById(req.params.id);

    if (!reviewToFind) {
      return res.status(404).json({
        success: false,
        message: "The productReview doesn`t exist",
      });
    }
    return res.status(200).json({
      success: true,
      productReview: reviewToFind,
    });
  } catch (error) {
    console.error("Error fetching product review:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching the product review",
    });
  }
});
router.post(`/add`, async (req, res) => {
  try {
    let productReview = new productReviewModel({
      productId: req.body.productId,
      customerId: req.body.customerId,
      customerName: req.body.customerName,
      review: req.body.review,
      rating: req.body.rating,
    });

    productReview = await productReview.save();

    res.status(200).json({
      productReview: productReview,
      success: true,
    });
  } catch (error) {
    console.error(error); // Log the error for debugging
    return res.status(500).json({
      message: "Couldn't create the Review",
      success: false,
    });
  }
});

module.exports = router;
