const jwt = require('jsonwebtoken');

// Create JWT token
const createJWT = (payload) => {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d' // Token expires in 7 days
    });
    return token;
  } catch (error) {
    console.error('JWT creation error:', error);
    throw new Error('Failed to create authentication token');
  }
};

// Verify JWT token
const verifyJWT = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return null; // Invalid token
    } else if (error.name === 'TokenExpiredError') {
      return null; // Expired token
    } else {
      console.error('JWT verification error:', error);
      return null;
    }
  }
};

// Decode JWT token without verification (for debugging)
const decodeJWT = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
};

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    console.error('Get token expiration error:', error);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    }
    return true; // Consider invalid tokens as expired
  } catch (error) {
    console.error('Check token expiration error:', error);
    return true;
  }
};

// Refresh JWT token
const refreshJWT = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Create new token with same payload but new expiration
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        userRole: decoded.userRole
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return newToken;
  } catch (error) {
    console.error('JWT refresh error:', error);
    throw new Error('Failed to refresh authentication token');
  }
};

module.exports = {
  createJWT,
  verifyJWT,
  decodeJWT,
  getTokenExpiration,
  isTokenExpired,
  refreshJWT
}; 