const axios = require('axios');
const { Product } = require('../models/storeModel');
const Asset = require('../models/assetModel');
const User = require('../models/userModel');

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

// ── LIST PRODUCTS (for ad campaign selection) ────────────────────────────────
exports.getAdProducts = async (req, res) => {
  try {
    const products = await Product.find({ creatorId: req.user.userId, isActive: true });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GENERATE AD COPY ─────────────────────────────────────────────────────────
exports.generateAdCopy = async (req, res) => {
  try {
    const { productId, platform, targetAudience } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const creator = await User.findById(req.user.userId).select('persona contentCreatorProfile fullName');

    // Draft ad copy via Python LLM backend
    const prompt = `Create a ${platform || 'Meta' } ad for a product called "${product.name}". 
Description: ${product.description || 'No description'}
Price: $${product.price}
Target audience: ${targetAudience || 'General audience'}
Creator: ${creator?.fullName || 'Content Creator'}
Tone: ${creator?.persona?.tone || 'professional, engaging'}

Generate:
1. Headline (under 40 chars)
2. Primary text (under 125 chars)
3. Description (under 30 chars)
4. Call-to-action button text
5. Audience profile (age, interests, behaviors)`;

    const llmRes = await axios.post(`${PYTHON_API}/agent/chat`, {
      message: prompt,
      history: [],
      creator_persona: creator?.persona || {},
      creator_id: req.user.userId,
    }, { timeout: 30000 });

    const adCopy = llmRes.data?.reply || 'Ad copy generation failed.';

    res.json({
      product: { name: product.name, price: product.price, image: product.image },
      adCopy,
      platform: platform || 'meta',
      targetAudience: targetAudience || 'General',
      note: 'This copy was AI-generated. Review before use. Live Meta Ads API submission is out of scope for MVP.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PULL MATCHING CREATIVE from asset library ────────────────────────────────
exports.getAdCreatives = async (req, res) => {
  try {
    const assets = await Asset.find({
      creatorId: req.user.userId,
      hub: 'studio',
      type: { $in: ['image', 'ad_creative', 'thumbnail', 'short', 'clip'] },
    }).sort({ createdAt: -1 }).limit(20);

    const grouped = {
      images: assets.filter(a => ['image', 'ad_creative', 'thumbnail'].includes(a.type)),
      videos: assets.filter(a => ['short', 'clip'].includes(a.type)),
    };

    res.json({ assets: grouped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── EXPORT CAMPAIGN PACK ─────────────────────────────────────────────────────
exports.exportCampaignPack = async (req, res) => {
  try {
    const { productId, adCopy, selectedAssetIds, platform, targetAudience, budget } = req.body;

    const product = await Product.findById(productId);
    const selectedAssets = await Asset.find({ _id: { $in: selectedAssetIds || [] } });

    const pack = {
      campaignName: `${product?.name || 'Untitled'} — ${platform || 'Meta'} Campaign`,
      exportedAt: new Date().toISOString(),
      platform: platform || 'meta',
      product: product ? {
        name: product.name,
        price: product.price,
        description: product.description,
        image: product.image,
      } : null,
      adCopy,
      targetAudience: targetAudience || 'General',
      dailyBudget: budget || 'Not set',
      creatives: selectedAssets.map(a => ({
        type: a.type,
        url: a.url,
        title: a.title,
      })),
      status: 'draft',
      note: 'MVP limitation: Live submission to Meta Ads API requires ad spend budget and is not included in this free-tier MVP. Export this pack and manually create the campaign in Meta Ads Manager.',
    };

    // Save as asset for future reference
    await Asset.create({
      type: 'campaign_pack',
      hub: 'store',
      creatorId: req.user.userId,
      title: pack.campaignName,
      description: `Exported campaign pack for ${product?.name || 'unknown product'}`,
      url: '',
      metadata: pack,
      tags: [platform || 'meta', 'campaign', 'draft'],
    });

    res.json({ pack, saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
