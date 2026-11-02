const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Platform overview stats
router.get('/stats', adminController.getPlatformStats);

// Creator quota monitor
router.get('/quotas', adminController.getCreatorQuotas);

// Job queue health
router.get('/jobs', adminController.getJobQueue);

// Payment health
router.get('/payments', adminController.getPaymentHealth);

// Alerts & incidents
router.get('/alerts', adminController.getAlerts);
router.put('/alerts/:id/resolve', adminController.resolveAlert);

module.exports = router;
