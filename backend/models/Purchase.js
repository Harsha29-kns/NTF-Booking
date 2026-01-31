const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  // Purchase identification
  purchaseId: {
    type: String,
    required: true,
    unique: true
  },

  // MERGED: Ticket ID (Number to match Smart Contract)
  // NOTE: Not unique because same ticketId can exist across different blockchain sessions
  ticketId: {
    type: Number,
    required: true
  },

  // Link to Registered User (New for Online Booking)
  buyerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // On-chain data
  contractAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  buyer: {
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
    type: String, // Store as string to handle large numbers (Wei)
    required: true
  },

  // Transaction data
  purchaseTxHash: {
    type: String,
    required: true,
    lowercase: true
  },
  downloadTxHash: {
    type: String,
    lowercase: true,
    default: null
  },
  refundTxHash: {
    type: String,
    lowercase: true,
    default: null
  },

  // Event data snapshot
  eventName: {
    type: String,
    required: true
  },
  organizer: {
    type: String,
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  posterUrl: {
    type: String,
    required: true
  },
  ticketImageUrl: {
    type: String,
    required: true
  },

  // Purchase status
  status: {
    type: String,
    enum: ['purchased', 'downloaded', 'refunded', 'expired'],
    default: 'purchased'
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  downloadDate: {
    type: Date,
    default: null
  },
  refundDate: {
    type: Date,
    default: null
  },
  refundAmount: {
    type: String,
    default: null
  },

  // MERGED: Buyer information (Legacy/Offline support)
  buyerInfo: {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    sellerPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ''
    }
  },

  // Additional data
  gasUsed: {
    purchase: Number,
    download: Number,
    refund: Number
  },
  gasPrice: {
    purchase: String,
    download: String,
    refund: String
  },
  blockNumber: {
    purchase: Number,
    download: Number,
    refund: Number
  },

  // User experience data
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  review: {
    type: String,
    maxlength: 500,
    default: null
  },
  reviewDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
purchaseSchema.index({ purchaseId: 1 });
purchaseSchema.index({ ticketId: 1 });
purchaseSchema.index({ buyer: 1 });
purchaseSchema.index({ seller: 1 });
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ purchaseDate: -1 });
// Compound unique index to prevent duplicate purchases (same transaction)
purchaseSchema.index({ purchaseTxHash: 1 }, { unique: true });
purchaseSchema.index({ eventDate: 1 });
purchaseSchema.index({ purchaseTxHash: 1 });
purchaseSchema.index({ downloadTxHash: 1 });

// Virtual for purchase age
purchaseSchema.virtual('age').get(function () {
  const now = new Date();
  const diff = now - this.purchaseDate;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days;
});

// Virtual for can download
purchaseSchema.virtual('canDownload').get(function () {
  return this.status === 'purchased' && !this.downloadTxHash;
});

// Virtual for can refund
purchaseSchema.virtual('canRefund').get(function () {
  const now = new Date();
  return this.status === 'purchased' &&
    now > this.eventDate &&
    !this.downloadTxHash &&
    !this.refundTxHash;
});

// Method to update status
purchaseSchema.methods.updateStatus = function (newStatus, txHash = null, additionalData = {}) {
  this.status = newStatus;

  switch (newStatus) {
    case 'downloaded':
      this.downloadDate = new Date();
      this.downloadTxHash = txHash;
      if (additionalData.gasUsed) this.gasUsed.download = additionalData.gasUsed;
      if (additionalData.gasPrice) this.gasPrice.download = additionalData.gasPrice;
      if (additionalData.blockNumber) this.blockNumber.download = additionalData.blockNumber;
      break;
    case 'refunded':
      this.refundDate = new Date();
      this.refundTxHash = txHash;
      this.refundAmount = additionalData.amount || this.price;
      if (additionalData.gasUsed) this.gasUsed.refund = additionalData.gasUsed;
      if (additionalData.gasPrice) this.gasPrice.refund = additionalData.gasPrice;
      if (additionalData.blockNumber) this.blockNumber.refund = additionalData.blockNumber;
      break;
    case 'expired':
      this.refundDate = new Date();
      break;
  }

  return this.save();
};

// Method to add review
purchaseSchema.methods.addReview = function (rating, review) {
  this.rating = rating;
  this.review = review;
  this.reviewDate = new Date();
  return this.save();
};

// Static method to get user purchases
purchaseSchema.statics.getUserPurchases = function (walletAddress, status = null) {
  const query = { buyer: walletAddress.toLowerCase() };
  if (status) query.status = status;

  return this.find(query).sort({ purchaseDate: -1 });
};

// Static method to get seller sales
purchaseSchema.statics.getSellerSales = function (walletAddress, status = null) {
  const query = { seller: walletAddress.toLowerCase() };
  if (status) query.status = status;

  return this.find(query).sort({ purchaseDate: -1 });
};

// Static method to get purchase statistics
purchaseSchema.statics.getStats = function (walletAddress, isSeller = false) {
  const field = isSeller ? 'seller' : 'buyer';
  const query = { [field]: walletAddress.toLowerCase() };

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: { $toDouble: '$price' } }
      }
    }
  ]);
};

// Transform JSON output
purchaseSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Purchase', purchaseSchema);