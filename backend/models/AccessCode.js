const mongoose = require('mongoose');

const accessCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    eventName: {
        type: String,
        required: true
    },
    organizerWallet: {
        type: String,
        required: true,
        lowercase: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Auto-delete after 24 hours (optional, maybe keep it longer)
    }
});

module.exports = mongoose.model('AccessCode', accessCodeSchema);
