const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // On-chain data
  ticketId: {
    type: Number,
    required: true,
    unique: true
  },
  contractAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  seller: {
    type: String,
    required: true,
    lowercase: true
  },
  price: {
    type: String, // Store as string to handle large numbers
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  saleEndDate: {
    type: Date,
    required: true
  },
  
  // Enhanced off-chain data
  eventName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  organizer: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['concert', 'sports', 'theater', 'conference', 'festival', 'other'],
    default: 'other'
  },
  venue: {
    name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  capacity: {
    type: Number,
    min: 1
  },
  totalTickets: {
    type: Number,
    required: true,
    min: 1
  },
  availableTickets: {
    type: Number,
    required: true,
    min: 0
  },
  ageRestriction: {
    type: String,
    enum: ['all', '18+', '21+'],
    default: 'all'
  },
  
  // Media
  posterUrl: {
    type: String,
    required: true
  },
  ticketImageUrl: {
    type: String,
    required: true
  },
  gallery: [String], // Additional images
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'active', 'sold_out', 'cancelled', 'completed'],
    default: 'active'
  },
  isSold: {
    type: Boolean,
    default: false
  },
  isDownloaded: {
    type: Boolean,
    default: false
  },
  isRefunded: {
    type: Boolean,
    default: false
  },
  buyer: {
    type: String,
    lowercase: true,
    default: null
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  
  // Metadata
  tags: [String],
  featured: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
eventSchema.index({ ticketId: 1 });
eventSchema.index({ seller: 1 });
eventSchema.index({ eventDate: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ 'venue.city': 1 });
eventSchema.index({ featured: 1, eventDate: 1 });
eventSchema.index({ createdAt: -1 });

// Text search index
eventSchema.index({
  eventName: 'text',
  organizer: 'text',
  description: 'text',
  'venue.name': 'text'
});

// Virtual for sale status
eventSchema.virtual('saleStatus').get(function() {
  const now = new Date();
  if (this.isRefunded) return 'refunded';
  if (this.isSold) return 'sold';
  if (now > this.saleEndDate) return 'ended';
  if (now < this.eventDate) return 'upcoming';
  return 'active';
});

// Virtual for time remaining
eventSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.saleEndDate);
  const diff = end - now;
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
});

// Method to update status
eventSchema.methods.updateStatus = function() {
  const now = new Date();
  
  if (this.isRefunded) {
    this.status = 'cancelled';
  } else if (this.isSold) {
    this.status = 'sold_out';
  } else if (now > this.eventDate) {
    this.status = 'completed';
  } else if (now > this.saleEndDate) {
    this.status = 'active'; // Keep as active even after sale ends
  } else {
    this.status = 'active';
  }
  
  return this.save();
};

// Method to increment views
eventSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to get available events
eventSchema.statics.getAvailable = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    saleEndDate: { $gt: now },
    isSold: false,
    isRefunded: false
  }).sort({ eventDate: 1 });
};

// Static method to search events
eventSchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    ...filters,
    status: 'active',
    saleEndDate: { $gt: new Date() }
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, eventDate: 1 });
};

// Transform JSON output
eventSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Event', eventSchema);

