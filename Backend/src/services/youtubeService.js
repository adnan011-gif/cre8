// youtubeService.js
const axios = require("axios");
const { getSubtitles } = require("youtube-captions-scraper");
const User = require("../models/userModel");
const Redis = require("ioredis");

// Redis connection - optional, gracefully disabled if not running
let redis = null;

const initRedis = () => {
  try {
    const client = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: null,
      retryStrategy: () => null, // Don't retry — Redis is optional
    });

    let errorLogged = false;
    client.on('error', (err) => {
      if (!errorLogged) {
        console.warn('⚠️ Redis unavailable, transcript caching disabled:', err.message);
        errorLogged = true;
      }
    });

    client.connect().catch(() => {
      if (!errorLogged) {
        console.warn('⚠️ Redis connection failed, transcript caching disabled.');
        errorLogged = true;
      }
    });

    return client;
  } catch (err) {
    console.warn('⚠️ Redis init failed:', err.message);
    return null;
  }
};

redis = initRedis();

const isRedisReady = () => redis && redis.status === 'ready';

exports.extractPersonaFromChannel = async (userId, channelId, maxVideos = 5) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set in environment variables");
    
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=id&order=date&maxResults=${maxVideos}`;

    // Step 1: Get video IDs
    const { data } = await axios.get(searchUrl);
    const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);

    // Step 2: Cache transcripts in Redis (1-day expiry) if Redis is available
    for (let videoId of videoIds) {
      const cacheKey = `transcript:${userId}:${videoId}`;
      if (isRedisReady()) {
        const alreadyCached = await redis.get(cacheKey);
        if (alreadyCached) continue;
      }
      try {
        const caption = await getSubtitles({ videoID: videoId, lang: "en" });
        const transcriptText = caption.map(line => line.text).join(" ");
        if (isRedisReady()) {
          await redis.setex(cacheKey, 86400, transcriptText);
        }
      } catch (err) {
        console.warn(`⚠️ No transcript for video: ${videoId}`);
        continue;
      }
    }

    // Step 3: Read transcripts back and send to AI
    const transcripts = await exports.getCachedTranscripts(userId);
    return await exports.sendToAIAndSave(userId, transcripts);
  } catch (error) {
    console.error("❌ Error in extractPersonaFromChannel:", error.message);
    throw new Error("Failed to extract persona from YouTube");
  }
};

/**
 * Send transcripts to AI and save persona
 */
exports.sendToAIAndSave = async (userId, transcripts) => {
  try {
    // FIXED: correct endpoint is /persona (not /extract_persona)
    const aiResponse = await axios.post("http://localhost:8000/persona", {
      transcripts,
    });
    
    // FIXED: unwrap the persona field from the AI response { persona: {...} }
    const personaData = aiResponse.data.persona || aiResponse.data;

    // Save persona in MongoDB
    await User.findByIdAndUpdate(userId, { persona: personaData });

    return personaData;
  } catch (error) {
    console.error("❌ Error in sendToAIAndSave:", error.message);
    throw new Error("Failed to process transcripts with AI");
  }
};

// Helper: Get cached transcripts for a user from Redis (or return empty array)
exports.getCachedTranscripts = async (userId) => {
  if (!isRedisReady()) {
    return [];
  }
  const keys = await redis.keys(`transcript:${userId}:*`);
  const transcripts = [];
  for (const key of keys) {
    const transcriptText = await redis.get(key);
    const videoId = key.split(":")[2];
    transcripts.push({ videoId, transcript: transcriptText });
  }
  return transcripts;
};

// Helper: Cache transcripts for recent videos
exports.cacheTranscripts = async (userId, channelId, maxVideos = 5) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=id&order=date&maxResults=${maxVideos}`;
  const { data } = await axios.get(searchUrl);
  const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);

  for (let videoId of videoIds) {
    if (isRedisReady()) {
      const cacheKey = `transcript:${userId}:${videoId}`;
      const exists = await redis.get(cacheKey);
      if (exists) continue;
    }
    try {
      const caption = await getSubtitles({ videoID: videoId, lang: "en" });
      const transcriptText = caption.map(line => line.text).join(" ");
      if (isRedisReady()) {
        const cacheKey = `transcript:${userId}:${videoId}`;
        await redis.setex(cacheKey, 86400, transcriptText);
      }
    } catch (err) {
      console.warn(`⚠️ No transcript for video: ${videoId}`);
    }
  }
};

/**
 * Manual persona input
 */
exports.saveManualPersona = async (userId, persona) => {
  try {
    await User.findByIdAndUpdate(userId, { persona });
    return persona;
  } catch (error) {
    console.error("❌ Error in saveManualPersona:", error.message);
    throw new Error("Failed to save manual persona");
  }
};