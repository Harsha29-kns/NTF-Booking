const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    index: true
  },
  eventName: {
    type: String,
    required: false // Optional, helps admin see what event it is
  },
  senderAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  receiverAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  txHash: {
    type: String, // Stores the blockchain transaction hash once approved
    default: null
  },
  adminComment: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  }
});

// Prevent duplicate pending requests for the same ticket
transferRequestSchema.index(
  { ticketId: 1, status: 1 }, 
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('TransferRequest', transferRequestSchema);