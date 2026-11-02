const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      default: '', // Store cover or generated merch preview URL
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPromoted: {
      type: Boolean,
      default: false,
    },
    promotionExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const orderSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
      index: true,
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'fulfilled', 'refunded'],
      default: 'pending',
    },
    total: {
      type: Number,
      required: [true, 'Order total is required'],
    },
    stripeSessionId: {
      type: String,
      default: '',
      index: true,
    },
    paymentIntentId: {
      type: String,
      default: '',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to list all orders for a specific creator fast
orderSchema.index({ creatorId: 1, status: 1 });

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

module.exports = { Product, Order };
