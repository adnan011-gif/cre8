const express = require('express');
const adsController = require('../controllers/adsController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET  /api/ads/products     — list creator's active products
router.get('/products', adsController.getAdProducts);

// POST /api/ads/generate-copy — draft ad copy via LLM
router.post('/generate-copy', adsController.generateAdCopy);

// GET  /api/ads/creatives     — pull matching assets from library
router.get('/creatives', adsController.getAdCreatives);

// POST /api/ads/export-pack   — export complete campaign pack
router.post('/export-pack', adsController.exportCampaignPack);

module.exports = router;
