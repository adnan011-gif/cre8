const Wallet = require('../models/walletModel');
const { Order } = require('../models/storeModel');

exports.getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId: req.user.userId });
    }
    res.json({ wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.depositFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) {
      await Wallet.create({ userId: req.user.userId });
    }

    const sessionId = `wallet_deposit_${Date.now()}_${req.user.userId}`;

    const order = new Order({
      productId: null,
      creatorId: req.user.userId,
      customerEmail: req.user.email || 'wallet@cre8hub.local',
      total: amount,
      status: 'pending',
      stripeSessionId: sessionId,
    });
    await order.save();

    res.json({
      sessionId,
      amount,
      mock: true,
      url: `/wallet/checkout?session_id=${sessionId}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.confirmDeposit = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const order = await Order.findOne({ stripeSessionId: sessionId });
    if (!order) {
      return res.status(404).json({ error: 'Deposit session not found' });
    }

    if (order.status === 'paid') {
      return res.json({ message: 'Already credited', balance: 0 });
    }

    const wallet = await Wallet.findOne({ userId: order.creatorId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const balanceBefore = wallet.balance;
    wallet.balance += order.total;
    wallet.transactions.push({
      type: 'deposit',
      amount: order.total,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: `Wallet top-up of ${order.total}`,
      reference: sessionId,
    });
    await wallet.save();

    order.status = 'paid';
    order.paymentIntentId = `wallet_pi_${Date.now()}`;
    await order.save();

    res.json({ message: 'Wallet credited', balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.spendFunds = async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const wallet = await Wallet.findOne({ userId: req.user.userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    wallet.transactions.push({
      type: 'spend',
      amount: -amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: description || 'Campaign spend',
    });
    await wallet.save();

    res.json({ message: 'Funds spent', balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
