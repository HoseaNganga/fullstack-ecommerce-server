const express = require("express");
const router = express.Router();
const stripe = require(`stripe`)(process.env.STRIPE_SECRET_KEY);

router.post(`/create`, async (req, res) => {
  const products = await req.body.products;

  // Prepare line items for Stripe Checkout
  const lineItems = products?.map((product) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: product.productName?.substr(0, 10) + "..", // Shortened product name
      },
      unit_amount: product.price * 100, // Amount in cents
    },
    quantity: product.quantity,
  }));

  // Create a customer with metadata
  const customer = await stripe.customers.create({
    metadata: {
      cart: JSON.stringify(products),
    },
  });

  // Create a Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer: customer.id,
    line_items: lineItems, // Use line items defined above
    mode: "payment",
    success_url: `${process.env.CLIENT_BASE_URL}/payment/complete/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_BASE_URL}/payment/cancel`,
  });

  res.json({ id: session.id });
});

router.get(`/payment/complete`, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.query.session_id,
      {
        expand: ["payment_intent.payment_method"],
      }
    );
    const lineItems = await stripe.checkout.sessions.listLineItems(
      req.query.session_id
    );

    const orderData = {
      customer_email: session.customer_details.email,
      payment_status: session.payment_status,
      payment_method: session.payment_intent.payment_method.type,
      products: lineItems.data,
      total_amount: session.amount_total / 100, // Total amount in proper currency unit (e.g., dollars instead of cents)
    };

    res.status(200).json(orderData); // Send the order data to the frontend
  } catch (error) {
    console.error("Error retrieving session", error);
    res.status(500).send("Error retrieving payment details");
  }
});

router.get(`/cancel`, async (req, res) => {
  res.redirect("/cart");
});

// Route to fetch customer data based on session ID
router.get("/customer/:id", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const customer = await stripe.customers.retrieve(session.customer);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Extract cart data from customer metadata
    const cart = JSON.parse(customer.metadata.cart || "[]"); // Handle empty cart case
    res.json({ cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
