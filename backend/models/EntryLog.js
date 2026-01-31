const mongoose = require('mongoose');

const entryLogSchema = new mongoose.Schema({
    ticketId: {
        type: Number,
        required: true,
        index: true
    },
    walletAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    eventName: String,
    scanTime: {
        type: Date,
        default: Date.now,
        index: true
    },
    gatekeeperAddress: {
        type: String,
        lowercase: true
    },
    scanResult: {
        type: String,
        enum: ['SUCCESS', 'DUPLICATE', 'INVALID', 'REFUNDED', 'ALREADY_USED'],
        required: true
    },
    ipAddress: String,
    userAgent: String,
    location: {
        gate: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    metadata: {
        entryTimestamp: Number, // Blockchain timestamp if marked on-chain
        txHash: String // Transaction hash if marked on-chain
    }
}, {
    timestamps: true
});

// Index for duplicate detection queries
entryLogSchema.index({ ticketId: 1, scanTime: -1 });
entryLogSchema.index({ scanResult: 1, scanTime: -1 });

// Static method to check for recent scans
entryLogSchema.statics.hasRecentScan = async function (ticketId, windowMinutes = 5) {
    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentScan = await this.findOne({
        ticketId: ticketId,
        scanTime: { $gte: cutoffTime }
    }).sort({ scanTime: -1 });

    return recentScan;
};

module.exports = mongoose.model('EntryLog', entryLogSchema);
