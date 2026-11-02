const axios = require('axios');

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

/**
 * Compare a post's performance against the creator's own baseline
 * and return one specific, concrete suggestion.
 *
 * @param {Object} post       - { title, type, content, metrics: { views, likes, comments, shares, engagement_rate } }
 * @param {Array}  pastOutputs - Array of creator's historical posts (same shape as post)
 * @param {Object} persona     - Creator's persona { niche, tone, style, ... }
 * @param {string} creatorId   - For circuit-breaker tracking
 * @returns {Object}           - { suggestion, baseline, delta }
 */
async function analyzePerformance(post, pastOutputs, persona = {}, creatorId = 'default') {
  // ── 1. Calculate baseline from past outputs ──────────────────────────────
  const validOutputs = (pastOutputs || []).filter(
    (p) => p.metrics && (p.metrics.views > 0 || p.metrics.engagement_rate > 0)
  );

  const baseline = validOutputs.length > 0
    ? _calculateBaseline(validOutputs)
    : { avgViews: 0, avgEngagement: 0, avgLikes: 0, avgComments: 0, avgShares: 0, sampleSize: 0 };

  const metrics = post.metrics || {};
  const postViews = metrics.views || 0;
  const postEngagement = metrics.engagement_rate || 0;

  // ── 2. Calculate deltas ─────────────────────────────────────────────────
  const viewDelta = baseline.avgViews > 0
    ? ((postViews - baseline.avgViews) / baseline.avgViews * 100).toFixed(1)
    : 0;

  const engagementDelta = baseline.avgEngagement > 0
    ? ((postEngagement - baseline.avgEngagement) / baseline.avgEngagement * 100).toFixed(1)
    : 0;

  const isUnderperforming = parseFloat(viewDelta) < -10 || parseFloat(engagementDelta) < -10;

  const delta = {
    viewDelta: `${viewDelta}%`,
    engagementDelta: `${engagementDelta}%`,
    postViews,
    baselineViews: Math.round(baseline.avgViews),
    postEngagement,
    baselineEngagement: baseline.avgEngagement.toFixed(2),
    isUnderperforming,
  };

  // ── 3. Generate specific suggestion via LLM ──────────────────────────────
  const niche = persona.niche || 'content creation';
  const tone = persona.tone || 'helpful';

  const prompt = `You are a data-driven content performance analyst.

A creator in the "${niche}" niche published a post titled "${post.title}" (type: ${post.type || 'post'}).

Performance vs their baseline:
- Views: ${postViews} vs baseline ${Math.round(baseline.avgViews)} (${viewDelta}%)
- Engagement rate: ${postEngagement}% vs baseline ${baseline.avgEngagement.toFixed(2)}% (${engagementDelta}%)
- Past data sample: ${baseline.sampleSize} previous posts

Give ONE specific, concrete, actionable suggestion to improve performance on this type of post.
Reference the exact metrics above in your suggestion.
Keep it under 3 sentences. Do NOT give generic encouragement.`;

  try {
    const llmRes = await axios.post(`${PYTHON_API}/agent/chat`, {
      message: prompt,
      history: [],
      creator_persona: { niche, tone },
      creator_id: creatorId,
    }, { timeout: 30000 });

    const suggestion = llmRes.data?.reply || 'Analysis unavailable.';

    return { suggestion, baseline, delta };
  } catch (err) {
    // Fallback: data-driven suggestion without LLM
    let fallbackSuggestion = '';
    if (isUnderperforming) {
      const worseMetric = Math.abs(parseFloat(viewDelta)) > Math.abs(parseFloat(engagementDelta))
        ? `views (${viewDelta}% vs baseline)`
        : `engagement rate (${engagementDelta}% vs baseline)`;
      fallbackSuggestion = `This post is underperforming in ${worseMetric}. Consider testing a stronger hook in the first 3 seconds and adding a direct call-to-action.`;
    } else {
      fallbackSuggestion = `This post is performing near or above your baseline. To further improve, try posting at a different time or testing a new content format.`;
    }

    return { suggestion: fallbackSuggestion, baseline, delta };
  }
}

function _calculateBaseline(outputs) {
  const totalViews = outputs.reduce((s, p) => s + (p.metrics?.views || 0), 0);
  const totalEngagement = outputs.reduce((s, p) => s + (p.metrics?.engagement_rate || 0), 0);
  const totalLikes = outputs.reduce((s, p) => s + (p.metrics?.likes || 0), 0);
  const totalComments = outputs.reduce((s, p) => s + (p.metrics?.comments || 0), 0);
  const totalShares = outputs.reduce((s, p) => s + (p.metrics?.shares || 0), 0);
  const count = outputs.length;

  return {
    avgViews: totalViews / count,
    avgEngagement: totalEngagement / count,
    avgLikes: totalLikes / count,
    avgComments: totalComments / count,
    avgShares: totalShares / count,
    sampleSize: count,
  };
}

module.exports = { analyzePerformance };
