const express = require('express');
const agencyController = require('../controllers/agencyController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All agency routes require authentication
router.use(authenticateToken);

// ── Profile ────────────────────────────────────────────────────────────────
// GET  /agency/profile   — fetch this user's agency account
router.get('/profile', agencyController.getProfile);

// POST /agency/profile   — create agency account (one per user)
router.post('/profile', agencyController.createProfile);

// ── Roster ─────────────────────────────────────────────────────────────────
// GET  /agency/roster              — list managed creators + usage stats
router.get('/roster', agencyController.getRoster);

// POST /agency/roster/add          — add a creator by email
router.post('/roster/add', agencyController.addCreator);

// DELETE /agency/roster/:creatorId — remove a creator
router.delete('/roster/:creatorId', agencyController.removeCreator);

// PUT /agency/roster/:creatorId/role — update creator's access role
router.put('/roster/:creatorId/role', agencyController.updateRole);

// ── Act-As (Impersonation) ─────────────────────────────────────────────────
// POST /agency/act-as/:creatorId   — start an act-as session
router.post('/act-as/:creatorId', agencyController.actAs);

// ── Performance Rollup ─────────────────────────────────────────────────────
// GET  /agency/performance         — cross-creator usage aggregation
router.get('/performance', agencyController.getPerformance);

// ── Audit Log ─────────────────────────────────────────────────────────────
// GET  /agency/audit               — last 100 actions for this agency
router.get('/audit', agencyController.getAuditLog);

module.exports = router;
