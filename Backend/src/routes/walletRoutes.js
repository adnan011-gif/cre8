const express = require('express');
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, walletController.getWallet);
router.post('/deposit', authenticateToken, walletController.depositFunds);
router.post('/confirm-deposit', authenticateToken, walletController.confirmDeposit);
router.post('/spend', authenticateToken, walletController.spendFunds);

module.exports = router;
