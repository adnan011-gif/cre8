const express = require('express');
const assetController = require('../controllers/assetController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken); // Protect all asset routes

router.post('/', assetController.saveAsset);
router.get('/', assetController.getAssets);
router.get('/:id', assetController.getAssetById);
router.delete('/:id', assetController.deleteAsset);

module.exports = router;
