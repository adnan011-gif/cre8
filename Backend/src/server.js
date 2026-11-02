const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

//routes
const userRoutes = require('./routes/userRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const assetRoutes = require('./routes/assetRoutes');
const storeRoutes = require('./routes/storeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const agencyRoutes = require('./routes/agencyRoutes');
const adsRoutes = require('./routes/adsRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const walletRoutes = require('./routes/walletRoutes');


//middleware
const { errorHandler } = require('./middleware/errorHandler');
const { connectDB } = require('./config/database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://localhost:5001"
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach(url => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    try {
      const hostname = new URL(origin).hostname;
      if (
        allowedOrigins.includes(normalized) ||
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.onrender.com') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
    } catch {
      if (allowedOrigins.includes(normalized) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Cre8Hub Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount API routes on both '/api' and '/' so requests work regardless of frontend prefix
['/api', ''].forEach(prefix => {
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/youtube`, youtubeRoutes);
  app.use(`${prefix}/assets`, assetRoutes);
  app.use(`${prefix}/store`, storeRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/agency`, agencyRoutes);
  app.use(`${prefix}/ads`, adsRoutes);
  app.use(`${prefix}/performance`, performanceRoutes);
  app.use(`${prefix}/wallet`, walletRoutes);
});


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected successfully');

    // Start background trend monitor (Milestone 5.1)
    const { startTrendMonitor } = require('./services/trendMonitor');
    if (process.env.NODE_ENV !== 'test') {
      startTrendMonitor();
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Sign In: POST http://localhost:${PORT}/api/users/signin`);
      console.log(`📝 Sign Up: POST http://localhost:${PORT}/api/users/signup`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 