const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['deposit', 'spend', 'withdrawal', 'refund'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  balanceBefore: {
    type: Number,
    required: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  reference: {
    type: String,
    default: '',
  },
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative'],
  },
  currency: {
    type: String,
    default: 'INR',
  },
  transactions: [transactionSchema],
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
