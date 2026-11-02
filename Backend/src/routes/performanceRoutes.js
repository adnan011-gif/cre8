const express = require('express');
const { analyzePerformance } = require('../services/performanceWatcher');
const User = require('../models/userModel');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// POST /api/performance/analyze  — analyze a post's performance vs creator baseline
router.post('/analyze', async (req, res) => {
  try {
    const { post } = req.body;
    if (!post || !post.title) {
      return res.status(400).json({ error: 'Post with title is required' });
    }

    const user = await User.findById(req.user.userId).select('pastOutputs persona contentCreatorProfile');
    const pastOutputs = user?.pastOutputs || [];
    const persona = user?.persona || { niche: user?.contentCreatorProfile?.contentGenre || 'general' };

    const result = await analyzePerformance(post, pastOutputs, persona, req.user.userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
