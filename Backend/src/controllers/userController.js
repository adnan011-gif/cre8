const userService = require('../services/userService');
const { createJWT } = require('../utils/jwt');

// ── Email Verification Code Flow ──────────────────────────────────────────────

const sendCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: { message: 'Email is required' } });
    }

    const result = await userService.sendEmailCode(email);
    if (!result.success) {
      return res.status(404).json({ success: false, error: { message: result.message } });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

const sendCodeForSignUp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: { message: 'Email is required' } });
    }

    const result = await userService.sendEmailCodeForSignUp(email);
    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message } });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

const verifyCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: { message: 'Email and code are required' } });
    }

    const result = await userService.verifyEmailCode(email, code);
    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message } });
    }

    res.json({ success: true, message: result.message, data: { verificationToken: result.verificationToken } });
  } catch (error) {
    next(error);
  }
};

// ── Authentication ────────────────────────────────────────────────────────────

const signIn = async (req, res, next) => {
  try {
    const { email, password, verificationToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false, error: { message: 'Email and password are required', details: 'Please provide both email and password' }
      });
    }

    if (!verificationToken) {
      return res.status(400).json({
        success: false, error: { message: 'Email not verified', details: 'Please verify your email first' }
      });
    }

    const result = await userService.signIn(email, password, verificationToken);

    if (!result.success) {
      return res.status(401).json({ success: false, error: { message: result.message, details: result.details } });
    }

    const token = createJWT({ userId: result.user._id, email: result.user.email, userRole: result.user.userRole });
    await userService.updateLastLogin(result.user._id);

    res.json({ success: true, message: 'Sign in successful', data: { user: result.user.getPublicProfile(), token } });
  } catch (error) {
    next(error);
  }
};

const signUp = async (req, res, next) => {
  try {
    const { email, password, fullName, userRole, verificationToken } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false, error: { message: 'Required fields missing', details: 'Email, password, and full name are required' }
      });
    }

    if (!verificationToken) {
      return res.status(400).json({
        success: false, error: { message: 'Email not verified', details: 'Please verify your email first' }
      });
    }

    const result = await userService.signUp(email, password, fullName, userRole, verificationToken);

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message, details: result.details } });
    }

    const token = createJWT({ userId: result.user._id, email: result.user.email, userRole: result.user.userRole });

    res.status(201).json({
      success: true, message: 'User registered successfully',
      data: { user: result.user.getPublicProfile(), token }
    });
  } catch (error) {
    next(error);
  }
};

// ── Profile & User Management ─────────────────────────────────────────────────

const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await userService.getUserById(userId);

    if (!result.success) {
      return res.status(404).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, data: { user: result.user.getPublicProfile() } });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;
    const result = await userService.updateUserProfile(userId, updateData);

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, message: 'Profile updated successfully', data: { user: result.user.getPublicProfile() } });
  } catch (error) {
    next(error);
  }
};

const deleteUserAccount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await userService.deleteUserAccount(userId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, message: 'Account deleted successfully', details: 'Your account and all associated data have been permanently removed' });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const result = await userService.getAllUsers({ page: parseInt(page), limit: parseInt(limit), role, search });

    res.json({
      success: true, data: { users: result.users.map(user => user.getPublicProfile()), pagination: result.pagination }
    });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserById(userId);

    if (!result.success) {
      return res.status(404).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, data: { user: result.user.getPublicProfile() } });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: { message: 'Token is required', details: 'Please provide a valid token' } });
    }

    const result = await userService.refreshToken(token);

    if (!result.success) {
      return res.status(401).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, message: 'Token refreshed successfully', data: { token: result.token } });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res) => {
  res.json({ success: true, message: 'Logout successful', details: 'Please remove the token from client-side storage' });
};

const updateRoleSpecificProfile = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const profileData = req.body;
    const result = await userService.updateRoleSpecificProfile(userId, profileData);

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, message: 'Profile updated successfully', data: { user: result.user.getPublicProfile() } });
  } catch (error) {
    next(error);
  }
};

const updatePersona = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const personaData = req.body;
    const result = await userService.updatePersona(userId, personaData);

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, message: 'Persona updated successfully', data: { user: result.user.getPublicProfile() } });
  } catch (error) {
    next(error);
  }
};

const addPastOutput = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const outputData = req.body;
    const result = await userService.addPastOutput(userId, outputData);

    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message, details: result.details } });
    }

    res.json({ success: true, message: 'Past output added successfully', data: { user: result.user.getPublicProfile() } });
  } catch (error) {
    next(error);
  }
};

// ── Password Reset ────────────────────────────────────────────────────────────

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: { message: 'Email is required' } });
    }

    const result = await userService.forgotPassword(email);
    if (!result.success) {
      return res.status(404).json({ success: false, error: { message: result.message } });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, verificationToken, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Email and password are required' } });
    }

    if (!verificationToken) {
      return res.status(400).json({ success: false, error: { message: 'Email not verified', details: 'Please verify your email first' } });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: { message: 'Password too short', details: 'Password must be at least 6 characters long' } });
    }

    const result = await userService.resetPassword(email, verificationToken, password);
    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: result.message } });
    }

    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendCode,
  sendCodeForSignUp,
  verifyCode,
  signIn,
  signUp,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateUserProfile,
  updateRoleSpecificProfile,
  updatePersona,
  addPastOutput,
  deleteUserAccount,
  getAllUsers,
  getUserById,
  refreshToken,
  logout,
};
