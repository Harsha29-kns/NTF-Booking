const mongoose = require('mongoose');

const gatekeeperCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    eventId: {
        type: String, // Storing as String to be safe with large IDs, though usually Number
        required: true,
        index: true
    },
    eventName: {
        type: String,
        required: true
    },
    eventDate: {
        type: Date,
        required: true
    },
    createdBy: {
        type: String, // Organizer Wallet Address
        required: true,
        lowercase: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Security: Bind to a specific device/browser upon first use
    deviceFingerprint: {
        type: String,
        default: null
    },
    usedAt: { // First time used
        type: Date,
        default: null
    },
    lastUsedAt: { // Last login time
        type: Date,
        default: null
    },
    scanCount: { // Number of tickets scanned by this gatekeeper
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true
});

// Indexes
gatekeeperCodeSchema.index({ code: 1 });
gatekeeperCodeSchema.index({ eventId: 1, createdBy: 1 });
gatekeeperCodeSchema.index({ expiresAt: 1 });

// Method to revoke code
gatekeeperCodeSchema.methods.revoke = function () {
    this.isActive = false;
    return this.save();
};

// Method to check validity
gatekeeperCodeSchema.methods.isValid = function () {
    return this.isActive && new Date() < this.expiresAt;
};

module.exports = mongoose.model('GatekeeperCode', gatekeeperCodeSchema);
