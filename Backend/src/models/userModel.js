const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic authentication & info
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters long'],
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  userRole: {
    type: String,
    enum: {
      values: ['content-creator', 'entrepreneur', 'social-media-manager', 'admin'],
      message: 'User role must be one of: content-creator, entrepreneur, social-media-manager, admin'
    },
    default: null
  },
  
  // Profile completion & status
  profileCompleted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Email verification code (for login/signup/password-reset flow)
  emailVerificationCode: {
    type: String,
    default: null,
    select: false,
  },
  emailVerificationCodeExpires: {
    type: Date,
    default: null,
  },
  emailVerificationCodeAttempts: {
    type: Number,
    default: 0,
  },

  lastLogin: {
    type: Date,
    default: null
  },
  avatar: {
    type: String,
    default: null
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'],
  },

  // Email verification flow (sign-in, sign-up, password reset)
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationTokenExpires: {
    type: Date,
    default: null,
  },

  // Password reset (legacy, kept for compatibility)
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },

  // ── Multi-tenancy / platform access level ──────────────────────────────────
  // accountType controls PLATFORM access level (separate from userRole which
  // describes the creator's niche/profession).
  accountType: {
    type: String,
    enum: {
      values: ['creator', 'agency', 'admin'],
      message: 'Account type must be one of: creator, agency, admin'
    },
    default: 'creator'
  },
  // Set when a creator is managed by an agency — references AgencyAccount._id
  agencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgencyAccount',
    default: null
  },

  // Content Creator Profile Data
  contentCreatorProfile: {
    contentGenre: {
      type: String,
      enum: {
        values: ['educational', 'entertainment', 'gaming', 'lifestyle', 'music', 'tech', 'travel', 'other'],
        message: 'Content genre must be one of: educational, entertainment, gaming, lifestyle, music, tech, travel, other'
      }
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    socialMediaLinks: {
      youtube: {
        type: String,
        trim: true,
        match: [/^https?:\/\/(www\.)?youtube\.com\//, 'Please provide a valid YouTube URL']
      },
      instagram: {
        type: String,
        trim: true,
        match: [/^https?:\/\/(www\.)?instagram\.com\//, 'Please provide a valid Instagram URL']
      },
      tiktok: {
        type: String,
        trim: true,
        match: [/^https?:\/\/(www\.)?tiktok\.com\//, 'Please provide a valid TikTok URL']
      },
      twitter: {
        type: String,
        trim: true,
        match: [/^https?:\/\/(www\.)?twitter\.com\//, 'Please provide a valid Twitter URL']
      }
    },
    contentStats: {
      totalVideos: {
        type: Number,
        default: 0,
        min: [0, 'Total videos cannot be negative']
      },
      totalViews: {
        type: Number,
        default: 0,
        min: [0, 'Total views cannot be negative']
      },
      totalSubscribers: {
        type: Number,
        default: 0,
        min: [0, 'Total subscribers cannot be negative']
      },
      averageViewsPerVideo: {
        type: Number,
        default: 0,
        min: [0, 'Average views cannot be negative']
      }
    },
    targetAudience: {
      ageRange: {
        min: {
          type: Number,
          min: [13, 'Minimum age must be at least 13'],
          max: [100, 'Maximum age cannot exceed 100']
        },
        max: {
          type: Number,
          min: [13, 'Minimum age must be at least 13'],
          max: [100, 'Maximum age cannot exceed 100']
        }
      },
      interests: [{
        type: String,
        trim: true,
        maxlength: [50, 'Interest cannot exceed 50 characters']
      }],
      location: {
        type: String,
        trim: true,
        maxlength: [100, 'Location cannot exceed 100 characters']
      }
    },
    collaborationPreferences: {
      isOpenToCollaborations: {
        type: Boolean,
        default: true
      },
      preferredCollaborationTypes: [{
        type: String,
        enum: {
          values: ['sponsored-content', 'product-reviews', 'brand-ambassador', 'event-appearances', 'cross-promotion'],
          message: 'Collaboration type must be one of: sponsored-content, product-reviews, brand-ambassador, event-appearances, cross-promotion'
        }
      }],
      minimumCollaborationRate: {
        type: Number,
        min: [0, 'Minimum rate cannot be negative']
      },
      rateCurrency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
      }
    }
  },

  // Entrepreneur Profile Data
  entrepreneurProfile: {
    businessCategory: {
      type: String,
      enum: {
        values: ['ecommerce', 'saas', 'consulting', 'agency', 'retail', 'manufacturing', 'other'],
        message: 'Business category must be one of: ecommerce, saas, consulting, agency, retail, manufacturing, other'
      }
    },
    businessDescription: {
      type: String,
      trim: true,
      minlength: [10, 'Business description must be at least 10 characters long'],
      maxlength: [1000, 'Business description cannot exceed 1000 characters']
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters']
    },
    businessWebsite: {
      type: String,
      trim: true,
      match: [/^https?:\/\//, 'Please provide a valid website URL starting with http:// or https://']
    },
    businessSize: {
      type: String,
      enum: {
        values: ['solo', 'small-team', 'medium', 'large'],
        message: 'Business size must be one of: solo, small-team, medium, large'
      },
      default: 'small-team'
    },
    annualRevenue: {
      type: String,
      enum: {
        values: ['under-50k', '50k-100k', '100k-500k', '500k-1m', '1m-5m', '5m-10m', '10m+', 'prefer-not-to-say'],
        message: 'Annual revenue must be one of the specified ranges'
      },
      default: 'prefer-not-to-say'
    },
    yearsInBusiness: {
      type: Number,
      min: [0, 'Years in business cannot be negative'],
      max: [100, 'Years in business cannot exceed 100']
    },
    targetMarket: {
      industry: [{
        type: String,
        trim: true,
        maxlength: [50, 'Industry cannot exceed 50 characters']
      }],
      customerType: {
        type: String,
        enum: {
          values: ['b2b', 'b2c', 'b2b2c', 'marketplace'],
          message: 'Customer type must be one of: b2b, b2c, b2b2c, marketplace'
        }
      },
      geographicFocus: [{
        type: String,
        trim: true,
        maxlength: [50, 'Geographic focus cannot exceed 50 characters']
      }],
      customerSize: {
        type: String,
        enum: {
          values: ['startups', 'small-businesses', 'medium-businesses', 'enterprises', 'individuals'],
          message: 'Customer size must be one of: startups, small-businesses, medium-businesses, enterprises, individuals'
        }
      }
    },
    marketingNeeds: {
      primaryGoals: [{
        type: String,
        enum: {
          values: ['brand-awareness', 'lead-generation', 'customer-acquisition', 'customer-retention', 'market-expansion', 'product-launch'],
          message: 'Primary goal must be one of the specified values'
        }
      }],
      budget: {
        type: String,
        enum: {
          values: ['under-1k', '1k-5k', '5k-10k', '10k-25k', '25k-50k', '50k+', 'flexible'],
          message: 'Budget must be one of the specified ranges'
        },
        default: 'flexible'
      },
      timeline: {
        type: String,
        enum: {
          values: ['immediate', 'within-month', 'within-quarter', 'within-year', 'ongoing', 'flexible'],
          message: 'Timeline must be one of the specified values'
        },
        default: 'flexible'
      },
      preferredChannels: [{
        type: String,
        enum: {
          values: ['social-media', 'content-marketing', 'email-marketing', 'paid-advertising', 'influencer-marketing', 'seo', 'pr'],
          message: 'Preferred channel must be one of the specified values'
        }
      }]
    },
    collaborationPreferences: {
      isOpenToCollaborations: {
        type: Boolean,
        default: true
      },
      preferredCollaborationTypes: [{
        type: String,
        enum: {
          values: ['content-creation', 'social-media-management', 'brand-partnerships', 'cross-promotion', 'joint-ventures'],
          message: 'Collaboration type must be one of the specified values'
        }
      }],
      minimumProjectValue: {
        type: Number,
        min: [0, 'Minimum project value cannot be negative']
      },
      preferredPaymentTerms: {
        type: String,
        enum: {
          values: ['upfront', 'milestone', 'monthly', 'quarterly', 'negotiable'],
          message: 'Preferred payment terms must be one of the specified values'
        },
        default: 'negotiable'
      }
    }
  },

  // Social Media Manager Profile Data
  socialMediaManagerProfile: {
    clientType: {
      type: String,
      enum: {
        values: ['influencers', 'small-businesses', 'corporate', 'individuals', 'mixed'],
        message: 'Client type must be one of: influencers, small-businesses, corporate, individuals, mixed'
      }
    },
    businessSize: {
      type: String,
      enum: {
        values: ['solo', 'small-team', 'medium', 'large'],
        message: 'Business size must be one of: solo, small-team, medium, large'
      }
    },
    socialMediaNiche: {
      type: String,
      enum: {
        values: ['content-creation', 'community-management', 'marketing-campaigns', 'analytics', 'full-service'],
        message: 'Social media niche must be one of: content-creation, community-management, marketing-campaigns, analytics, full-service'
      }
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    experience: {
      yearsOfExperience: {
        type: Number,
        min: [0, 'Years of experience cannot be negative'],
        max: [50, 'Years of experience cannot exceed 50']
      },
      industriesWorked: [{
        type: String,
        trim: true,
        maxlength: [50, 'Industry cannot exceed 50 characters']
      }],
      certifications: [{
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Certification name cannot exceed 100 characters']
        },
        issuer: {
          type: String,
          trim: true,
          maxlength: [100, 'Issuer cannot exceed 100 characters']
        },
        dateObtained: {
          type: Date,
          required: true
        },
        expiryDate: {
          type: Date
        },
        certificateUrl: {
          type: String,
          trim: true
        }
      }]
    },
    services: {
      primaryServices: [{
        type: String,
        enum: {
          values: ['content-strategy', 'social-media-management', 'community-management', 'paid-advertising', 'influencer-outreach', 'analytics-reporting', 'crisis-management', 'brand-voice-development'],
          message: 'Primary service must be one of the specified values'
        }
      }],
      additionalServices: [{
        type: String,
        trim: true,
        maxlength: [100, 'Additional service cannot exceed 100 characters']
      }],
      servicePackages: [{
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Package name cannot exceed 100 characters']
        },
        description: {
          type: String,
          trim: true,
          maxlength: [300, 'Package description cannot exceed 300 characters']
        },
        price: {
          type: Number,
          min: [0, 'Price cannot be negative']
        },
        priceType: {
          type: String,
          enum: {
            values: ['hourly', 'monthly', 'project-based', 'retainer'],
            message: 'Price type must be one of: hourly, monthly, project-based, retainer'
          }
        },
        features: [{
          type: String,
          trim: true,
          maxlength: [100, 'Feature cannot exceed 100 characters']
        }]
      }]
    },
    socialMediaPlatforms: {
      platforms: [{
        name: {
          type: String,
          required: true,
          enum: {
            values: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest', 'snapchat'],
            message: 'Platform must be one of the specified values'
          }
        },
        expertise: {
          type: String,
          enum: {
            values: ['beginner', 'intermediate', 'advanced', 'expert'],
            message: 'Expertise level must be one of: beginner, intermediate, advanced, expert'
          }
        },
        yearsOfExperience: {
          type: Number,
          min: [0, 'Years of experience cannot be negative']
        }
      }],
      crossPlatformStrategy: {
        type: Boolean,
        default: true
      }
    },
    clientPortfolio: {
      currentClients: {
        type: Number,
        min: [0, 'Current clients cannot be negative']
      },
      totalClientsServed: {
        type: Number,
        min: [0, 'Total clients served cannot be negative']
      },
      averageClientRetention: {
        type: Number,
        min: [0, 'Average client retention cannot be negative'],
        max: [100, 'Average client retention cannot exceed 100%']
      },
      caseStudies: [{
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Case study title cannot exceed 100 characters']
        },
        clientName: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Client name cannot exceed 100 characters']
        },
        industry: {
          type: String,
          trim: true,
          maxlength: [50, 'Industry cannot exceed 50 characters']
        },
        challenge: {
          type: String,
          trim: true,
          maxlength: [300, 'Challenge cannot exceed 300 characters']
        },
        solution: {
          type: String,
          trim: true,
          maxlength: [500, 'Solution cannot exceed 500 characters']
        },
        results: {
          type: String,
          trim: true,
          maxlength: [500, 'Results cannot exceed 500 characters']
        },
        metrics: {
          followerGrowth: {
            type: Number,
            min: [0, 'Follower growth cannot be negative']
          },
          engagementIncrease: {
            type: Number,
            min: [0, 'Engagement increase cannot be negative']
          },
          leadGeneration: {
            type: Number,
            min: [0, 'Lead generation cannot be negative']
          }
        },
        duration: {
          type: String,
          trim: true,
          maxlength: [50, 'Duration cannot exceed 50 characters']
        },
        date: {
          type: Date,
          required: true
        }
      }]
    },
    collaborationPreferences: {
      isOpenToCollaborations: {
        type: Boolean,
        default: true
      },
      preferredCollaborationTypes: [{
        type: String,
        enum: {
          values: ['referral-partnerships', 'white-label-services', 'joint-ventures', 'affiliate-marketing', 'cross-promotion'],
          message: 'Collaboration type must be one of the specified values'
        }
      }],
      minimumProjectValue: {
        type: Number,
        min: [0, 'Minimum project value cannot be negative']
      },
      preferredPaymentTerms: {
        type: String,
        enum: {
          values: ['upfront', 'milestone', 'monthly', 'quarterly', 'negotiable'],
          message: 'Preferred payment terms must be one of the specified values'
        },
        default: 'negotiable'
      },
      availability: {
        isAvailable: {
          type: Boolean,
          default: true
        },
        responseTime: {
          type: String,
          enum: {
            values: ['within-24h', 'within-48h', 'within-week', 'varies'],
            message: 'Response time must be one of: within-24h, within-48h, within-week, varies'
          },
          default: 'within-48h'
        },
        maxClients: {
          type: Number,
          min: [1, 'Maximum clients must be at least 1']
        }
      }
    }
  },

  // Persona data (for your persona extraction feature)
  persona: {
    extractedFrom: {
      type: String,
      enum: ['youtube', 'manual', 'ai-generated'],
      default: null
    },
    personalityTraits: [{
      type: String,
      trim: true,
      maxlength: [50, 'Personality trait cannot exceed 50 characters']
    }],
    communicationStyle: {
      type: String,
      enum: ['formal', 'casual', 'enthusiastic', 'professional', 'friendly', 'authoritative'],
      default: null
    },
    contentPreferences: [{
      type: String,
      trim: true,
      maxlength: [100, 'Content preference cannot exceed 100 characters']
    }],
    targetAudienceInsights: {
      type: String,
      trim: true,
      maxlength: [500, 'Target audience insights cannot exceed 500 characters']
    },
    extractedAt: {
      type: Date,
      default: null
    }
  },

  // Past outputs (for your video generation feature)
  pastOutputs: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Output title cannot exceed 200 characters']
    },
    type: {
      type: String,
      enum: ['video', 'content', 'strategy', 'analysis'],
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Output description cannot exceed 1000 characters']
    },
    content: {
      type: String,
      trim: true
    },
    metadata: {
      platform: {
        type: String,
        trim: true
      },
      duration: {
        type: Number,
        min: [0, 'Duration cannot be negative']
      },
      views: {
        type: Number,
        min: [0, 'Views cannot be negative']
      },
      engagement: {
        type: Number,
        min: [0, 'Engagement cannot be negative']
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]

}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true }, // Include virtuals when converting to JSON
  toObject: { virtuals: true }
});

// Virtual for profile completion status
userSchema.virtual('hasCompleteProfile').get(function() {
  return this.profileCompleted && this.userRole;
});

// Virtual for engagement rate (content creator)
userSchema.virtual('engagementRate').get(function() {
  if (this.userRole === 'content-creator' && this.contentCreatorProfile?.contentStats?.totalSubscribers > 0) {
    return (this.contentCreatorProfile.contentStats.totalViews / this.contentCreatorProfile.contentStats.totalSubscribers * 100).toFixed(2);
  }
  return 0;
});

// Virtual for business maturity (entrepreneur)
userSchema.virtual('businessMaturity').get(function() {
  if (this.userRole === 'entrepreneur' && this.entrepreneurProfile?.yearsInBusiness) {
    const years = this.entrepreneurProfile.yearsInBusiness;
    if (years < 1) return 'startup';
    if (years < 3) return 'early-stage';
    if (years < 5) return 'growth-stage';
    if (years < 10) return 'established';
    return 'mature';
  }
  return 'unknown';
});

// Virtual for total experience (social media manager)
userSchema.virtual('totalPlatformExperience').get(function() {
  if (this.userRole === 'social-media-manager' && this.socialMediaManagerProfile?.socialMediaPlatforms?.platforms) {
    return this.socialMediaManagerProfile.socialMediaPlatforms.platforms.reduce((total, platform) => {
      return total + (platform.yearsOfExperience || 0);
    }, 0);
  }
  return 0;
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ userRole: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'contentCreatorProfile.contentGenre': 1 });
userSchema.index({ 'entrepreneurProfile.businessCategory': 1 });
userSchema.index({ 'socialMediaManagerProfile.clientType': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ userRole: role, isActive: true });
};

// Method to deactivate user
userSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Method to activate user
userSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Method to mark email as verified
userSchema.methods.verifyEmail = function() {
  this.emailVerified = true;
  return this.save();
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Method to update content creator stats
userSchema.methods.updateContentStats = function(stats) {
  if (this.userRole === 'content-creator') {
    Object.assign(this.contentCreatorProfile.contentStats, stats);
    if (this.contentCreatorProfile.contentStats.totalVideos > 0) {
      this.contentCreatorProfile.contentStats.averageViewsPerVideo = 
        Math.round(this.contentCreatorProfile.contentStats.totalViews / this.contentCreatorProfile.contentStats.totalVideos);
    }
  }
  return this.save();
};

// Method to add past output
userSchema.methods.addPastOutput = function(outputData) {
  this.pastOutputs.push(outputData);
  // Keep only last 50 outputs
  if (this.pastOutputs.length > 50) {
    this.pastOutputs = this.pastOutputs.slice(-50);
  }
  return this.save();
};

// Method to update persona
userSchema.methods.updatePersona = function(personaData) {
  Object.assign(this.persona, personaData, { extractedAt: new Date() });
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 