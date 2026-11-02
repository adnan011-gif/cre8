const { Product, Order } = require('../models/storeModel');
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

// ── PRODUCT CRUD ─────────────────────────────────────────────────────────────

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, image } = req.body;
    const creatorId = req.user.userId;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const product = new Product({
      name,
      description,
      price,
      image: image || '',
      creatorId,
    });

    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('❌ Error in createProduct:', error.message);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const products = await Product.find({ creatorId }).sort({ createdAt: -1 });
    res.status(200).json({ products });
  } catch (error) {
    console.error('❌ Error in getProducts:', error.message);
    res.status(500).json({ error: 'Failed to retrieve products', details: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.userId;
    const { name, description, price, image, isActive, isPromoted, promotionExpiresAt } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: id, creatorId },
      { name, description, price, image, isActive, isPromoted, promotionExpiresAt },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    res.status(200).json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('❌ Error in updateProduct:', error.message);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.userId;

    const product = await Product.findOneAndDelete({ _id: id, creatorId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteProduct:', error.message);
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
};

// ── PUBLIC STOREFRONT ─────────────────────────────────────────────────────────

exports.getPublicStorefront = async (req, res) => {
  try {
    const { creatorId } = req.params;

    // Fetch creator's basic details
    const creator = await User.findById(creatorId).select('fullName avatar userRole contentCreatorProfile.bio');
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Fetch active products — promoted first
    let products = await Product.find({ creatorId, isActive: true }).sort({ createdAt: -1 });
    products.sort((a, b) => {
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      return 0;
    });

    res.status(200).json({
      creator: {
        id: creator._id,
        fullName: creator.fullName,
        avatar: creator.avatar,
        role: creator.userRole,
        bio: creator.contentCreatorProfile?.bio || '',
      },
      products,
    });
  } catch (error) {
    console.error('❌ Error in getPublicStorefront:', error.message);
    res.status(500).json({ error: 'Failed to load storefront', details: error.message });
  }
};

// ── CHECKOUT & ORDERS ────────────────────────────────────────────────────────

exports.createCheckoutSession = async (req, res) => {
  try {
    const { productId, customerEmail } = req.body;

    if (!productId || !customerEmail) {
      return res.status(400).json({ error: 'productId and customerEmail are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create a pending order in our database first
    const order = new Order({
      productId: product._id,
      creatorId: product.creatorId,
      customerEmail,
      total: product.price,
      status: 'pending',
    });

    // Check if Stripe is configured or if we should use Mock Sandbox Checkout
    const isMock = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock_key';

    if (isMock) {
      // Mock Sandbox Checkout flow — instantly generates a sandbox URL for the customer
      const sessionId = `mock_session_${Date.now()}`;
      order.stripeSessionId = sessionId;
      await order.save();

      return res.status(200).json({
        url: `/checkout/mock?session_id=${sessionId}`,
        mock: true,
        orderId: order._id,
      });
    }

    // Look up creator's currency preference
    const creator = await User.findById(product.creatorId).select('currency');
    const currency = (creator?.currency || 'INR').toLowerCase();

    // Real Stripe Checkout Session creation
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: product.name,
              description: product.description,
              images: product.image ? [product.image] : [],
            },
            unit_amount: Math.round(product.price * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/store/${product.creatorId}`,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('❌ Error in createCheckoutSession:', error.message);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
};

/**
 * Mock payment confirmation (for easy sandbox testing without Stripe CLI webhook forwarding)
 */
exports.confirmMockPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const order = await Order.findOne({ stripeSessionId: sessionId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'paid';
    order.paymentIntentId = `mock_pi_${Date.now()}`;
    await order.save();

    // Log the Stripe webhook simulation status (Milestone 4.3 dependency)
    console.log(`[StripeWebhook Simulation] Webhook simulated successfully for sessionId=${sessionId}`);

    res.status(200).json({ message: 'Mock payment confirmed successfully', order });
  } catch (error) {
    console.error('❌ Error in confirmMockPayment:', error.message);
    res.status(500).json({ error: 'Payment confirmation failed', details: error.message });
  }
};

/**
 * Real Stripe Webhook handler
 */
exports.handleStripeWebhook = async (req, res) => {
  let event = req.body;

  // Real webhook signature validation if endpoint secret is set
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (endpointSecret) {
    const signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  // Handle successful payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const order = await Order.findOne({ stripeSessionId: session.id });
      if (order) {
        order.status = 'paid';
        order.paymentIntentId = session.payment_intent;
        await order.save();
        console.log(`[StripeWebhook] Order ${order._id} marked as PAID.`);
      }
    } catch (err) {
      console.error('[StripeWebhook] Error updating order status:', err.message);
      return res.status(500).json({ error: 'Database update failed' });
    }
  }

  res.json({ received: true });
};

// ── PROMOTE PRODUCT ────────────────────────────────────────────────────────────

exports.promoteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { budget } = req.body;
    const creatorId = req.user.userId;

    if (!budget || budget <= 0) {
      return res.status(400).json({ error: 'Valid budget is required' });
    }

    const product = await Product.findOne({ _id: id, creatorId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    const wallet = await Wallet.findOne({ userId: creatorId });
    if (!wallet || wallet.balance < budget) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= budget;
    wallet.transactions.push({
      type: 'spend',
      amount: -budget,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: `Promotion for "${product.name}"`,
    });
    await wallet.save();

    product.isPromoted = true;
    product.promotionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await product.save();

    res.json({
      message: 'Product promoted successfully',
      product,
      walletBalance: wallet.balance,
    });
  } catch (error) {
    console.error('❌ Error in promoteProduct:', error.message);
    res.status(500).json({ error: 'Failed to promote product', details: error.message });
  }
};

exports.unPromoteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.userId;

    const product = await Product.findOneAndUpdate(
      { _id: id, creatorId },
      { isPromoted: false, promotionExpiresAt: null },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    res.json({ message: 'Promotion removed', product });
  } catch (error) {
    console.error('❌ Error in unPromoteProduct:', error.message);
    res.status(500).json({ error: 'Failed to remove promotion', details: error.message });
  }
};

// ── CREATOR ORDERS DASHBOARD ──────────────────────────────────────────────────

exports.getCreatorOrders = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const orders = await Order.find({ creatorId })
      .populate('productId', 'name price')
      .sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (error) {
    console.error('❌ Error in getCreatorOrders:', error.message);
    res.status(500).json({ error: 'Failed to retrieve orders', details: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const creatorId = req.user.userId;

    if (!['paid', 'fulfilled', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, creatorId },
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }

    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('❌ Error in updateOrderStatus:', error.message);
    res.status(500).json({ error: 'Failed to update order status', details: error.message });
  }
};
