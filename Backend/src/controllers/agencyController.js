const AgencyAccount = require('../models/agencyModel');
const User = require('../models/userModel');
const UsageLog = require('../models/usageModel');
const AuditLog = require('../models/auditLogModel');

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — verify agency access before every operation
// ─────────────────────────────────────────────────────────────────────────────
const getAgencyForUser = async (userId) => {
  return AgencyAccount.findOne({ ownerId: userId, isActive: true });
};

const assertAccess = (agency, creatorId) => {
  if (!agency || !agency.hasAccessTo(creatorId)) {
    const err = new Error('Access denied: creator is not managed by this agency');
    err.status = 403;
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /agency/profile  — get or create this user's agency account
// ─────────────────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    let agency = await getAgencyForUser(req.user.userId);
    res.json({ agency });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.createProfile = async (req, res) => {
  try {
    const { agencyName } = req.body;
    if (!agencyName) return res.status(400).json({ error: 'agencyName is required' });

    const existing = await AgencyAccount.findOne({ ownerId: req.user.userId });
    if (existing) return res.status(409).json({ error: 'Agency already exists', agency: existing });

    const agency = await AgencyAccount.create({ agencyName, ownerId: req.user.userId });

    // Upgrade the user's accountType to 'agency'
    await User.findByIdAndUpdate(req.user.userId, { accountType: 'agency' });

    res.status(201).json({ message: 'Agency created', agency });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /agency/roster  — list managed creators with live stats
// ─────────────────────────────────────────────────────────────────────────────
exports.getRoster = async (req, res) => {
  try {
    const agency = await getAgencyForUser(req.user.userId);
    if (!agency) return res.status(404).json({ error: 'No agency account found' });

    const creatorIds = agency.managedCreators.map((mc) => mc.creatorId);

    // Fetch creator user records
    const creators = await User.find({ _id: { $in: creatorIds } }).select(
      'fullName email avatar userRole profileCompleted createdAt'
    );

    // Aggregate usage stats per creator (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const usageStats = await UsageLog.aggregate([
      { $match: { creatorId: { $in: creatorIds }, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$creatorId',
          totalTokens: { $sum: '$tokensUsed' },
          totalCalls: { $sum: 1 },
          services: { $addToSet: '$service' },
        },
      },
    ]);

    const statsMap = {};
    usageStats.forEach((s) => { statsMap[s._id.toString()] = s; });

    // Build roster with role context from agency
    const roster = creators.map((c) => {
      const mcEntry = agency.managedCreators.find(
        (mc) => mc.creatorId.toString() === c._id.toString()
      );
      return {
        creatorId: c._id,
        fullName: c.fullName,
        email: c.email,
        avatar: c.avatar,
        userRole: c.userRole,
        profileCompleted: c.profileCompleted,
        joinedAt: c.createdAt,
        agencyRole: mcEntry?.role || 'view',
        addedAt: mcEntry?.addedAt,
        usage: statsMap[c._id.toString()] || { totalTokens: 0, totalCalls: 0, services: [] },
      };
    });

    res.json({ roster, agencyName: agency.agencyName, total: roster.length });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /agency/roster/add  — add a creator to agency roster
// ─────────────────────────────────────────────────────────────────────────────
exports.addCreator = async (req, res) => {
  try {
    const { creatorEmail, role = 'view' } = req.body;
    if (!creatorEmail) return res.status(400).json({ error: 'creatorEmail is required' });

    const creator = await User.findOne({ email: creatorEmail.toLowerCase() });
    if (!creator) return res.status(404).json({ error: 'Creator not found with that email' });

    const agency = await getAgencyForUser(req.user.userId);
    if (!agency) return res.status(404).json({ error: 'No agency account found — create one first' });

    if (agency.hasAccessTo(creator._id)) {
      return res.status(409).json({ error: 'Creator already in roster' });
    }

    agency.managedCreators.push({ creatorId: creator._id, role });
    await agency.save();

    // Link the creator back to this agency
    await User.findByIdAndUpdate(creator._id, { agencyId: agency._id });

    await _writeAudit(req.user.userId, 'add_creator', { targetCreatorId: creator._id, role });

    res.json({ message: `${creator.fullName} added to roster`, creator: { id: creator._id, fullName: creator.fullName, role } });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE /agency/roster/:creatorId  — remove creator from roster
// ─────────────────────────────────────────────────────────────────────────────
exports.removeCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const agency = await getAgencyForUser(req.user.userId);
    assertAccess(agency, creatorId);

    agency.managedCreators = agency.managedCreators.filter(
      (mc) => mc.creatorId.toString() !== creatorId
    );
    await agency.save();

    await User.findByIdAndUpdate(creatorId, { agencyId: null });
    await _writeAudit(req.user.userId, 'remove_creator', { targetCreatorId: creatorId });

    res.json({ message: 'Creator removed from roster' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. PUT /agency/roster/:creatorId/role  — change access role
// ─────────────────────────────────────────────────────────────────────────────
exports.updateRole = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { role } = req.body;
    if (!['view', 'act-as'].includes(role)) {
      return res.status(400).json({ error: "role must be 'view' or 'act-as'" });
    }

    const agency = await getAgencyForUser(req.user.userId);
    assertAccess(agency, creatorId);

    const mc = agency.managedCreators.find((m) => m.creatorId.toString() === creatorId);
    mc.role = role;
    await agency.save();

    await _writeAudit(req.user.userId, 'update_role', { targetCreatorId: creatorId, newRole: role });

    res.json({ message: 'Role updated', creatorId, role });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /agency/act-as/:creatorId  — impersonate creator (act-as mode)
//    Returns a scoped payload the client uses to prefix API calls
// ─────────────────────────────────────────────────────────────────────────────
exports.actAs = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const agency = await getAgencyForUser(req.user.userId);
    assertAccess(agency, creatorId);

    if (!agency.canActAs(creatorId)) {
      return res.status(403).json({ error: "Agency role is 'view' only — cannot act-as this creator" });
    }

    const creator = await User.findById(creatorId).select('fullName email avatar userRole');
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    await _writeAudit(req.user.userId, 'act_as', { targetCreatorId: creatorId });

    res.json({
      actAsSession: {
        agencyUserId: req.user.userId,
        impersonatedCreatorId: creatorId,
        creatorName: creator.fullName,
        creatorEmail: creator.email,
        agencyName: agency.agencyName,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8h session
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /agency/performance  — cross-creator performance rollup
// ─────────────────────────────────────────────────────────────────────────────
exports.getPerformance = async (req, res) => {
  try {
    const agency = await getAgencyForUser(req.user.userId);
    if (!agency) return res.status(404).json({ error: 'No agency account found' });

    const creatorIds = agency.managedCreators.map((mc) => mc.creatorId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const usage = await UsageLog.aggregate([
      { $match: { creatorId: { $in: creatorIds }, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { creatorId: '$creatorId', service: '$service' },
          calls: { $sum: 1 },
          tokens: { $sum: '$tokensUsed' },
        },
      },
      { $sort: { '_id.creatorId': 1 } },
    ]);

    // Build per-creator breakdown
    const breakdown = {};
    usage.forEach(({ _id, calls, tokens }) => {
      const cid = _id.creatorId.toString();
      if (!breakdown[cid]) breakdown[cid] = { services: {}, totalCalls: 0, totalTokens: 0 };
      breakdown[cid].services[_id.service] = { calls, tokens };
      breakdown[cid].totalCalls += calls;
      breakdown[cid].totalTokens += tokens;
    });

    // Fetch names
    const creators = await User.find({ _id: { $in: creatorIds } }).select('fullName');
    const nameMap = {};
    creators.forEach((c) => { nameMap[c._id.toString()] = c.fullName; });

    const result = Object.entries(breakdown).map(([cid, data]) => ({
      creatorId: cid,
      fullName: nameMap[cid] || 'Unknown',
      ...data,
    }));

    res.json({ performance: result, period: '30d', creatorCount: creatorIds.length });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET /agency/audit  — audit log of all agency actions
// ─────────────────────────────────────────────────────────────────────────────
exports.getAuditLog = async (req, res) => {
  try {
    const agency = await getAgencyForUser(req.user.userId);
    if (!agency) return res.status(404).json({ error: 'No agency account found' });

    const logs = await AuditLog.find({ agencyOwnerId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('targetCreatorId', 'fullName email');

    res.json({ logs });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE — write an audit log entry
// ─────────────────────────────────────────────────────────────────────────────
async function _writeAudit(agencyOwnerId, action, meta = {}) {
  try {
    await AuditLog.create({ agencyOwnerId, action, meta });
  } catch (e) {
    console.warn('[AgencyController] Audit write failed:', e.message);
  }
}
