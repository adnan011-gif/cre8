const User = require('../models/userModel');
const JobQueue = require('../models/jobQueueModel');
const UsageLog = require('../models/usageModel');
const Alert = require('../models/alertModel');
const { Order } = require('../models/storeModel');
const { dispatchAlert } = require('../services/alerting');

// ── PLATFORM STATS & QUOTAS ──────────────────────────────────────────────────

exports.getPlatformStats = async (req, res) => {
  try {
    const totalCreators = await User.countDocuments({ accountType: 'creator' });
    const totalAgencies = await User.countDocuments({ accountType: 'agency' });
    const totalJobs = await JobQueue.countDocuments();
    const activeJobs = await JobQueue.countDocuments({ status: { $in: ['queued', 'running'] } });
    
    // Aggregation of total sales
    const paidOrders = await Order.find({ status: { $in: ['paid', 'fulfilled'] } });
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    res.status(200).json({
      creatorsCount: totalCreators,
      agenciesCount: totalAgencies,
      jobsCount: totalJobs,
      activeJobsCount: activeJobs,
      revenueTotal: totalRevenue,
    });
  } catch (error) {
    console.error('❌ Error in getPlatformStats:', error.message);
    res.status(500).json({ error: 'Failed to retrieve platform stats', details: error.message });
  }
};

exports.getCreatorQuotas = async (req, res) => {
  try {
    // Fetch all creators
    const creators = await User.find({ accountType: 'creator' }).select('fullName email');
    
    // Aggregate usages in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const quotaReports = await Promise.all(creators.map(async (creator) => {
      const llmCalls = await UsageLog.countDocuments({
        creatorId: creator._id,
        type: 'llm_call',
        createdAt: { $gte: oneDayAgo }
      });

      const imageGens = await UsageLog.countDocuments({
        creatorId: creator._id,
        type: 'image_gen',
        createdAt: { $gte: oneDayAgo }
      });

      const videoGens = await UsageLog.countDocuments({
        creatorId: creator._id,
        type: 'video_gen',
        createdAt: { $gte: oneDayAgo }
      });

      // Fair-use thresholds per creator (e.g. 50 LLM calls, 20 images, 5 videos per 24 hours)
      const limits = { llm: 50, image: 20, video: 5 };
      const usagePercentage = Math.round(
        ((llmCalls / limits.llm) * 0.4 + (imageGens / limits.image) * 0.4 + (videoGens / limits.video) * 0.2) * 100
      );

      // Check if creator is approaching limits to trigger alerts (Milestone 4.4)
      if (usagePercentage >= 90) {
        await dispatchAlert({
          type: 'quota_threshold',
          severity: usagePercentage >= 100 ? 'critical' : 'warning',
          message: `Creator ${creator.fullName} reached ${usagePercentage}% of daily fair-use limits.`,
          creatorId: creator._id,
        });
      }

      return {
        creatorId: creator._id,
        fullName: creator.fullName,
        email: creator.email,
        usage: {
          llmCalls,
          imageGens,
          videoGens,
        },
        limits,
        usagePercentage: Math.min(usagePercentage, 100),
      };
    }));

    res.status(200).json({ quotas: quotaReports });
  } catch (error) {
    console.error('❌ Error in getCreatorQuotas:', error.message);
    res.status(500).json({ error: 'Failed to aggregate creator quotas', details: error.message });
  }
};

// ── JOB QUEUE HEALTH ─────────────────────────────────────────────────────────

exports.getJobQueue = async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Retrieve active or failed jobs
    const jobs = await JobQueue.find()
      .populate('creatorId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(100);

    // Process jobs, auto-flagging stuck ones (running > 5 minutes)
    const processedJobs = await Promise.all(jobs.map(async (job) => {
      if (job.status === 'running' && job.updatedAt < fiveMinutesAgo) {
        job.status = 'stuck';
        await job.save();

        // Dispatch alert (Milestone 4.2)
        await dispatchAlert({
          type: 'job_stuck',
          severity: 'warning',
          message: `Job ${job._id} (${job.taskType}) stuck in running state for > 5 minutes.`,
          creatorId: job.creatorId?._id || null,
        });
      }
      return job;
    }));

    res.status(200).json({ jobs: processedJobs });
  } catch (error) {
    console.error('❌ Error in getJobQueue:', error.message);
    res.status(500).json({ error: 'Failed to retrieve job queue logs', details: error.message });
  }
};

// ── PAYMENT HEALTH ───────────────────────────────────────────────────────────

exports.getPaymentHealth = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const successfulOrders = await Order.countDocuments({ status: { $in: ['paid', 'fulfilled'] } });
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const refundedOrders = await Order.countDocuments({ status: 'refunded' });

    const refundRate = totalOrders > 0 ? Math.round((refundedOrders / totalOrders) * 100) : 0;

    res.status(200).json({
      totalOrders,
      successfulOrders,
      pendingOrders,
      refundedOrders,
      refundRate,
    });
  } catch (error) {
    console.error('❌ Error in getPaymentHealth:', error.message);
    res.status(500).json({ error: 'Failed to retrieve payment health stats', details: error.message });
  }
};

// ── ALERTS & INCIDENTS ───────────────────────────────────────────────────────

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ resolved: false })
      .populate('creatorId', 'fullName')
      .sort({ createdAt: -1 });

    res.status(200).json({ alerts });
  } catch (error) {
    console.error('❌ Error in getAlerts:', error.message);
    res.status(500).json({ error: 'Failed to fetch platform alerts', details: error.message });
  }
};

exports.resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByIdAndUpdate(id, { resolved: true }, { new: true });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.status(200).json({ message: 'Alert resolved successfully', alert });
  } catch (error) {
    console.error('❌ Error in resolveAlert:', error.message);
    res.status(500).json({ error: 'Failed to resolve alert', details: error.message });
  }
};
