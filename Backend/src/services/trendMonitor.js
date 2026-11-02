const axios = require('axios');
const User = require('../models/userModel');
const Asset = require('../models/assetModel');
const JobQueue = require('../models/jobQueueModel');

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

let _intervalHandle = null;

function startTrendMonitor() {
  if (_intervalHandle) return;
  console.log('[TrendMonitor] Starting — polling every 12h');
  _runOnce();
  _intervalHandle = setInterval(_runOnce, POLL_INTERVAL_MS);
}

function stopTrendMonitor() {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
  }
}

async function _runOnce() {
  console.log(`[TrendMonitor] Poll cycle started at ${new Date().toISOString()}`);
  try {
    const creators = await User.find({
      accountType: 'creator',
      isActive: true,
      'contentCreatorProfile.contentGenre': { $exists: true, $ne: '' },
    }).select('_id fullName contentCreatorProfile.contentGenre');

    console.log(`[TrendMonitor] Found ${creators.length} creators with niches`);

    for (const creator of creators) {
      const niche = creator.contentCreatorProfile?.contentGenre;
      if (!niche) continue;

      try {
        const jobEntry = await JobQueue.create({
          creatorId: creator._id,
          taskType: 'trend_research',
          status: 'running',
          progress: 0,
          startedAt: new Date(),
        });

        const res = await axios.post(`${PYTHON_API}/agent/trends`, {
          niche,
          num_trends: 5,
          creator_id: creator._id.toString(),
        }, { timeout: 30000 });

        const trends = res.data?.trends || [];

        if (trends.length > 0) {
          await Asset.create({
            type: 'trend_data',
            hub: 'agent',
            creatorId: creator._id,
            title: `Trend research — ${niche}`,
            description: `Auto-polled trends for ${niche}`,
            url: '',
            metadata: { trends, niche, polledAt: new Date().toISOString() },
            tags: [niche, 'trend', 'auto'],
          });

          // Auto-generate pitches and calendar
          await _autoGeneratePitches(creator._id, niche, trends);

          console.log(`[TrendMonitor] Saved ${trends.length} trends for ${creator._id}`);
        }

        jobEntry.status = 'completed';
        jobEntry.progress = 100;
        jobEntry.completedAt = new Date();
        await jobEntry.save();
      } catch (err) {
        console.error(`[TrendMonitor] Failed for creator ${creator._id}: ${err.message}`);
        await JobQueue.findOneAndUpdate(
          { creatorId: creator._id, taskType: 'trend_research', status: 'running' },
          { status: 'failed', error: err.message, completedAt: new Date() },
        );
      }
    }
  } catch (err) {
    console.error(`[TrendMonitor] Cycle error: ${err.message}`);
  }
  console.log(`[TrendMonitor] Poll cycle finished at ${new Date().toISOString()}`);
}

async function _autoGeneratePitches(creatorId, niche, trends) {
  try {
    // Fetch persona data
    const creator = await User.findById(creatorId).select('persona contentCreatorProfile');
    const persona = creator?.persona || {};
    const tone = persona.tone || 'engaging';

    // Generate pitches via Python backend
    const pitchRes = await axios.post(`${PYTHON_API}/agent/pitches`, {
      trends,
      creator_persona: { niche, tone },
      platform: 'youtube',
      creator_id: creatorId.toString(),
    }, { timeout: 30000 });

    const pitches = pitchRes.data?.pitches || [];
    if (pitches.length === 0) return;

    // Build calendar
    const calRes = await axios.post(`${PYTHON_API}/agent/calendar`, {
      pitches,
      posting_frequency: 3,
      start_date: new Date().toISOString().split('T')[0],
      creator_id: creatorId.toString(),
    }, { timeout: 15000 });

    const calendar = calRes.data?.calendar || [];

    // Store calendar as asset
    await Asset.create({
      type: 'calendar_data',
      hub: 'agent',
      creatorId,
      title: `Auto-generated content calendar — ${niche}`,
      description: `Calendar with ${pitches.length} pitches from auto trend poll`,
      url: '',
      metadata: { pitches, calendar, niche, generatedAt: new Date().toISOString() },
      tags: [niche, 'calendar', 'auto'],
    });

    console.log(`[TrendMonitor] Auto-generated ${pitches.length} pitches + calendar for ${creatorId}`);
  } catch (err) {
    console.error(`[TrendMonitor] Auto-pitch failed for ${creatorId}: ${err.message}`);
  }
}

module.exports = { startTrendMonitor, stopTrendMonitor, _runOnce };
