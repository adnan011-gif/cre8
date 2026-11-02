const { verifyJWT } = require('../utils/jwt');
const User = require('../models/userModel');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify token
    const decoded = verifyJWT(token);
    
    if (!decoded) {
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Token is not valid or has expired'
      });
    }

    // Check if user still exists in database
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User no longer exists'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      userRole: decoded.userRole,
      fullName: user.fullName,
      profileCompleted: user.profileCompleted
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware (for routes that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyJWT(token);
      
      if (decoded) {
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            userRole: decoded.userRole,
            fullName: user.fullName,
            profileCompleted: user.profileCompleted
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!roles.includes(req.user.userRole)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

// Check if user has completed profile
const requireProfileCompletion = (req, res, next) => {
  if (!req.user.profileCompleted) {
    return res.status(403).json({ 
      error: 'Profile incomplete',
      message: 'Please complete your profile before accessing this resource'
    });
  }
  next();
};

// Check if user has specific role
const requireSpecificRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (req.user.userRole !== requiredRole) {
      return res.status(403).json({ 
        error: 'Incorrect role',
        message: `This resource is only available for ${requiredRole}s`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireProfileCompletion,
  requireSpecificRole
}; 