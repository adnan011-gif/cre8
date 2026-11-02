const express = require('express');
const storeController = require('../controllers/storeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── Public Storefront and Checkout (No auth required) ──────────────────────
router.get('/public/:creatorId', storeController.getPublicStorefront);
router.post('/checkout', storeController.createCheckoutSession);
router.post('/checkout/confirm-mock', storeController.confirmMockPayment);
router.post('/webhook', express.raw({ type: 'application/json' }), storeController.handleStripeWebhook);

// ── Protected Store Management and Orders (Auth required) ──────────────────
router.post('/products', authenticateToken, storeController.createProduct);
router.get('/products', authenticateToken, storeController.getProducts);
router.put('/products/:id', authenticateToken, storeController.updateProduct);
router.delete('/products/:id', authenticateToken, storeController.deleteProduct);
router.post('/products/:id/promote', authenticateToken, storeController.promoteProduct);
router.post('/products/:id/unpromote', authenticateToken, storeController.unPromoteProduct);

router.get('/orders', authenticateToken, storeController.getCreatorOrders);
router.put('/orders/:id', authenticateToken, storeController.updateOrderStatus);

module.exports = router;
