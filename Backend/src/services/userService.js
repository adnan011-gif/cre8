const crypto = require('crypto');
const User = require('../models/userModel');
const { verifyJWT } = require('../utils/jwt');
const { generateEmailCode, hashEmailCode, compareEmailCode, generateVerificationToken } = require('../utils/verification');
const emailService = require('./emailService');

// ── Email Verification Code Flow ──────────────────────────────────────────────

const sendEmailCode = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { success: false, message: 'No account with that email address exists' };
    }

    const code = generateEmailCode();
    const hashedCode = await hashEmailCode(code);

    await User.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          emailVerificationCode: hashedCode,
          emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          emailVerificationCodeAttempts: 0,
        },
      }
    );

    const sent = await emailService.sendVerificationCode(email, code);

    return {
      success: true,
      message: sent.delivered
        ? 'Verification code sent to your email'
        : 'Verification code generated!',
      code: code,
    };

  } catch (error) {
    console.error('Send email code service error:', error);
    return { success: false, message: 'Failed to send verification code' };
  }
};

const sendEmailCodeForSignUp = async (email) => {
  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists' };
    }

    const code = generateEmailCode();
    const hashedCode = await hashEmailCode(code);

    const tempUser = new User({
      email: email.toLowerCase(),
      password: crypto.randomBytes(20).toString('hex'),
      fullName: 'temp',
      emailVerificationCode: hashedCode,
      emailVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      emailVerificationCodeAttempts: 0,
    });
    await tempUser.save();

    const sent = await emailService.sendVerificationCode(email, code);

    return {
      success: true,
      message: sent.delivered
        ? 'Verification code sent to your email'
        : 'Verification code generated!',
      code: code,
      tempUserId: tempUser._id.toString(),
    };

  } catch (error) {
    console.error('Send email code for signup error:', error);
    return { success: false, message: 'Failed to send verification code' };
  }
};

const verifyEmailCode = async (email, code) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+emailVerificationCode');

    if (!user || !user.emailVerificationCode) {
      return { success: false, message: 'No verification code found. Please request a new one.' };
    }

    if (user.emailVerificationCodeExpires < new Date()) {
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { emailVerificationCode: null, emailVerificationCodeExpires: null, emailVerificationCodeAttempts: 0 } }
      );
      return { success: false, message: 'Verification code has expired. Please request a new one.' };
    }

    if (user.emailVerificationCodeAttempts >= 5) {
      await User.updateOne(
        { email: email.toLowerCase() },
        { $set: { emailVerificationCode: null, emailVerificationCodeExpires: null, emailVerificationCodeAttempts: 0 } }
      );
      return { success: false, message: 'Too many failed attempts. Please request a new code.' };
    }

    const isValid = await compareEmailCode(code, user.emailVerificationCode);

    if (!isValid) {
      await User.updateOne(
        { email: email.toLowerCase() },
        { $inc: { emailVerificationCodeAttempts: 1 } }
      );
      return { success: false, message: 'Invalid verification code' };
    }

    const verificationToken = generateVerificationToken();
    await User.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          emailVerificationToken: verificationToken,
          emailVerificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000),
          emailVerificationCode: null,
          emailVerificationCodeExpires: null,
          emailVerificationCodeAttempts: 0,
        },
      }
    );

    return {
      success: true,
      message: 'Email verified successfully',
      verificationToken,
    };

  } catch (error) {
    console.error('Verify email code service error:', error);
    return { success: false, message: 'Failed to verify code' };
  }
};

// ── Authentication ────────────────────────────────────────────────────────────

const signIn = async (email, password, verificationToken) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return { success: false, message: 'Invalid credentials', details: 'Email or password is incorrect' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Account deactivated', details: 'Your account has been deactivated. Please contact support.' };
    }

    if (user.emailVerificationToken !== verificationToken || user.emailVerificationTokenExpires < new Date()) {
      return { success: false, message: 'Email not verified', details: 'Please verify your email first' };
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return { success: false, message: 'Invalid credentials', details: 'Email or password is incorrect' };
    }

    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;
    await user.save();

    return { success: true, user };

  } catch (error) {
    console.error('Sign in service error:', error);
    return { success: false, message: 'Authentication failed', details: 'An error occurred during sign in' };
  }
};

const signUp = async (email, password, fullName, userRole, verificationToken) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return { success: false, message: 'Verification required', details: 'Please verify your email first' };
    }

    if (user.emailVerificationToken !== verificationToken || user.emailVerificationTokenExpires < new Date()) {
      return { success: false, message: 'Email not verified', details: 'Please verify your email first' };
    }

    user.password = password;
    user.fullName = fullName;
    user.userRole = userRole || null;
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;
    await user.save();

    return { success: true, user };

  } catch (error) {
    console.error('Sign up service error:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return { success: false, message: 'Validation failed', details: validationErrors.join(', ') };
    }
    return { success: false, message: 'Registration failed', details: 'An error occurred during registration' };
  }
};

// ── Profile & User Management (unchanged) ─────────────────────────────────────

const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', details: 'The requested user does not exist' };
    }
    return { success: true, user };
  } catch (error) {
    console.error('Get user by ID service error:', error);
    return { success: false, message: 'Failed to fetch user', details: 'An error occurred while fetching user data' };
  }
};

const updateUserProfile = async (userId, updateData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', details: 'The requested user does not exist' };
    }

    const allowedFields = ['fullName', 'userRole', 'avatar'];
    const updates = {};

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return { success: false, message: 'No valid fields to update', details: 'Please provide at least one valid field to update' };
    }

    Object.assign(user, updates);
    await user.save();

    return { success: true, user };
  } catch (error) {
    console.error('Update user profile service error:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return { success: false, message: 'Validation failed', details: validationErrors.join(', ') };
    }
    return { success: false, message: 'Profile update failed', details: 'An error occurred while updating profile' };
  }
};

const updateRoleSpecificProfile = async (userId, profileData) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found', details: 'The requested user does not exist' };
    }

    switch (user.userRole) {
      case 'content-creator': {
        const ccProfile = profileData.contentCreatorProfile || {};
        if (profileData.contentGenre) ccProfile.contentGenre = profileData.contentGenre;
        if (Object.keys(ccProfile).length > 0) {
          if (!user.contentCreatorProfile) user.contentCreatorProfile = {};
          Object.assign(user.contentCreatorProfile, ccProfile);
          user.markModified('contentCreatorProfile');
        }
        break;
      }
      case 'entrepreneur': {
        const entProfile = profileData.entrepreneurProfile || {};
        if (profileData.businessCategory) entProfile.businessCategory = profileData.businessCategory;
        if (profileData.businessDescription) entProfile.businessDescription = profileData.businessDescription;
        if (Object.keys(entProfile).length > 0) {
          if (!user.entrepreneurProfile) user.entrepreneurProfile = {};
          Object.assign(user.entrepreneurProfile, entProfile);
          user.markModified('entrepreneurProfile');
        }
        break;
      }
      case 'social-media-manager': {
        const smmProfile = profileData.socialMediaManagerProfile || {};
        if (profileData.clientType) smmProfile.clientType = profileData.clientType;
        if (profileData.businessSize) smmProfile.businessSize = profileData.businessSize;
        if (profileData.socialMediaNiche) smmProfile.socialMediaNiche = profileData.socialMediaNiche;
        if (Object.keys(smmProfile).length > 0) {
          if (!user.socialMediaManagerProfile) user.socialMediaManagerProfile = {};
          Object.assign(user.socialMediaManagerProfile, smmProfile);
          user.markModified('socialMediaManagerProfile');
        }
        break;
      }
      default:
        return { success: false, message: 'Invalid user role', details: 'User role is not set or invalid' };
    }

    user.profileCompleted = true;
    await user.save();

    return { success: true, user };
  } catch (error) {
    console.error('Update role specific profile service error:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return { success: false, message: 'Validation failed', details: validationErrors.join(', ') };
    }
    return { success: false, message: 'Profile update failed', details: 'An error occurred while updating profile' };
  }
};

const updatePersona = async (userId, personaData) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found', details: 'The requested user does not exist' };
    await user.updatePersona(personaData);
    return { success: true, user };
  } catch (error) {
    console.error('Update persona service error:', error);
    return { success: false, message: 'Persona update failed', details: 'An error occurred while updating persona' };
  }
};

const addPastOutput = async (userId, outputData) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found', details: 'The requested user does not exist' };
    await user.addPastOutput(outputData);
    return { success: true, user };
  } catch (error) {
    console.error('Add past output service error:', error);
    return { success: false, message: 'Failed to add past output', details: 'An error occurred while adding past output' };
  }
};

const deleteUserAccount = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found', details: 'The requested user does not exist' };
    await User.findByIdAndDelete(userId);
    return { success: true, message: 'Account deleted successfully' };
  } catch (error) {
    console.error('Delete user account service error:', error);
    return { success: false, message: 'Account deletion failed', details: 'An error occurred while deleting account' };
  }
};

const getAllUsers = async ({ page = 1, limit = 10, role, search }) => {
  try {
    const skip = (page - 1) * limit;
    const query = { isActive: true };

    if (role) query.userRole = role;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalPages = Math.ceil(totalUsers / limit);

    return {
      success: true, users,
      pagination: { currentPage: page, totalPages, totalUsers, hasNextPage: page < totalPages, hasPrevPage: page > 1, limit }
    };
  } catch (error) {
    console.error('Get all users service error:', error);
    return { success: false, message: 'Failed to fetch users', details: 'An error occurred while fetching users' };
  }
};

const updateLastLogin = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
    return { success: true };
  } catch (error) {
    console.error('Update last login service error:', error);
    return { success: false };
  }
};

const refreshToken = async (token) => {
  try {
    const decoded = verifyJWT(token);
    if (!decoded) return { success: false, message: 'Invalid token', details: 'Token is not valid' };

    const user = await User.findById(decoded.userId);
    if (!user) return { success: false, message: 'Invalid token', details: 'User no longer exists' };
    if (!user.isActive) return { success: false, message: 'Account deactivated', details: 'Your account has been deactivated' };

    const { createJWT } = require('../utils/jwt');
    const newToken = createJWT({ userId: user._id, email: user.email, userRole: user.userRole });

    return { success: true, token: newToken };
  } catch (error) {
    console.error('Refresh token service error:', error);
    return { success: false, message: 'Token refresh failed', details: 'An error occurred while refreshing token' };
  }
};

const getUserStats = async () => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const roleStats = await User.aggregate([{ $group: { _id: '$userRole', count: { $sum: 1 } } }]);

    return { success: true, stats: { totalUsers, activeUsers, verifiedUsers, roleBreakdown: roleStats } };
  } catch (error) {
    console.error('Get user stats service error:', error);
    return { success: false, message: 'Failed to fetch user statistics', details: 'An error occurred while fetching statistics' };
  }
};

// ── Password Reset (email-code based) ──────────────────────────────────────────

const forgotPassword = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return { success: false, message: 'No account with that email address exists' };
    return { success: true, message: 'If an account exists, a verification code has been sent' };
  } catch (error) {
    console.error('Forgot password service error:', error);
    return { success: false, message: 'Failed to process request' };
  }
};

const resetPassword = async (email, verificationToken, newPassword) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return { success: false, message: 'User not found' };

    if (user.emailVerificationToken !== verificationToken || user.emailVerificationTokenExpires < new Date()) {
      return { success: false, message: 'Email not verified', details: 'Please verify your email first' };
    }

    user.password = newPassword;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpires = null;
    await user.save();

    return { success: true, message: 'Password has been reset successfully' };
  } catch (error) {
    console.error('Reset password service error:', error);
    return { success: false, message: 'Failed to reset password' };
  }
};

module.exports = {
  sendEmailCode,
  sendEmailCodeForSignUp,
  verifyEmailCode,
  signIn,
  signUp,
  getUserById,
  updateUserProfile,
  updateRoleSpecificProfile,
  updatePersona,
  addPastOutput,
  deleteUserAccount,
  getAllUsers,
  updateLastLogin,
  refreshToken,
  getUserStats,
  forgotPassword,
  resetPassword,
};
