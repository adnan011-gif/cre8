const Asset = require('../models/assetModel');

/**
 * Save a new generated asset (image, video, etc.)
 */
exports.saveAsset = async (req, res) => {
  try {
    const { type, hub, campaignId, title, description, url, metadata, tags } = req.body;
    const creatorId = req.user.userId; // from authenticateToken middleware

    if (!type || !hub || !url) {
      return res.status(400).json({ error: 'type, hub, and url are required fields' });
    }

    const asset = new Asset({
      type,
      hub,
      creatorId,
      campaignId: campaignId || null,
      title,
      description,
      url,
      metadata: metadata || {},
      tags: tags || [],
    });

    await asset.save();
    res.status(201).json({ message: 'Asset saved successfully', asset });
  } catch (error) {
    console.error('❌ Error in saveAsset:', error.message);
    res.status(500).json({ error: 'Failed to save asset', details: error.message });
  }
};

/**
 * Get all assets for the logged-in creator, optionally filtered by hub or type
 */
exports.getAssets = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const { hub, type, campaignId } = req.query;

    const query = { creatorId };
    if (hub) query.hub = hub;
    if (type) query.type = type;
    if (campaignId) query.campaignId = campaignId;

    const assets = await Asset.find(query).sort({ createdAt: -1 });
    res.status(200).json({ assets, count: assets.length });
  } catch (error) {
    console.error('❌ Error in getAssets:', error.message);
    res.status(500).json({ error: 'Failed to retrieve assets', details: error.message });
  }
};

/**
 * Get a specific asset by ID
 */
exports.getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.userId;

    const asset = await Asset.findOne({ _id: id, creatorId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.status(200).json({ asset });
  } catch (error) {
    console.error('❌ Error in getAssetById:', error.message);
    res.status(500).json({ error: 'Failed to retrieve asset', details: error.message });
  }
};

/**
 * Delete a specific asset
 */
exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const creatorId = req.user.userId;

    const asset = await Asset.findOneAndDelete({ _id: id, creatorId });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found or unauthorized' });
    }

    res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('❌ Error in deleteAsset:', error.message);
    res.status(500).json({ error: 'Failed to delete asset', details: error.message });
  }
};
