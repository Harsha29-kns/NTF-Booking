const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address']
  },
  username: {
    type: String,
    trim: true,
    maxlength: 50
  },
  // --- ADD THIS FIELD ---
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  // ----------------------
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  profileImage: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500
  },
  isOrganizer: {
    type: Boolean,
    default: false
  },
  organizerInfo: {
    companyName: String,
    website: String,
    description: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showWallet: { type: Boolean, default: true }
    }
  },
  stats: {
    ticketsPurchased: { type: Number, default: 0 },
    eventsCreated: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ walletAddress: 1 });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isOrganizer: 1 });

// Virtual for user's full name
userSchema.virtual('displayName').get(function() {
  return this.username || this.walletAddress.slice(0, 6) + '...' + this.walletAddress.slice(-4);
});

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Method to update stats
userSchema.methods.updateStats = function(type, amount = 0) {
  switch (type) {
    case 'ticket_purchased':
      this.stats.ticketsPurchased += 1;
      this.stats.totalSpent += amount;
      break;
    case 'event_created':
      this.stats.eventsCreated += 1;
      break;
    case 'ticket_sold':
      this.stats.totalEarned += amount;
      break;
  }
  return this.save();
};

// Static method to find or create user
userSchema.statics.findOrCreate = async function(walletAddress, userData = {}) {
  let user = await this.findOne({ walletAddress });
  
  if (!user) {
    user = new this({
      walletAddress,
      ...userData
    });
    await user.save();
  }
  
  return user;
};

// Transform JSON output
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);