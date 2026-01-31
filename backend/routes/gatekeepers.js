const express = require('express');
const router = express.Router();
const AccessCode = require('../models/AccessCode');
const { authenticateToken: auth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// @route   POST /api/gatekeepers/generate
// @desc    Generate a new access code (Organizer only)
router.post('/generate', auth, async (req, res) => {
    try {
        const { eventName } = req.body;

        if (!req.user.isOrganizer) {
            return res.status(403).json({ message: 'Only organizers can generate codes' });
        }

        if (!eventName) {
            return res.status(400).json({ message: 'Event Name is required' });
        }

        // Generate a 6-digit random code (numbers only for easy entry)
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Check uniqueness (highly unlikely to collide for active codes, but good practice)
        const existing = await AccessCode.findOne({ code });
        if (existing) {
            return res.status(500).json({ message: 'Code generation collision, please try again' });
        }

        const accessCode = await AccessCode.create({
            code,
            eventName,
            organizerWallet: req.user.walletAddress
        });

        res.json({
            success: true,
            code: accessCode.code,
            eventName: accessCode.eventName
        });

    } catch (error) {
        console.error('Generate code error:', error);
        res.status(500).json({ message: 'Server error generating code' });
    }
});

// @route   GET /api/gatekeepers/my-codes
// @desc    Get active codes for the organizer
router.get('/my-codes', auth, async (req, res) => {
    try {
        const codes = await AccessCode.find({
            organizerWallet: req.user.walletAddress.toLowerCase(),
            isActive: true
        }).sort({ createdAt: -1 });

        res.json(codes);
    } catch (error) {
        console.error('Fetch codes error:', error);
        res.status(500).json({ message: 'Server error fetching codes' });
    }
});

// @route   POST /api/gatekeepers/login
// @desc    Gatekeeper Login using Access Code
router.post('/login', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Access Code required' });
        }

        const accessCode = await AccessCode.findOne({ code, isActive: true });

        if (!accessCode) {
            return res.status(401).json({ message: 'Invalid or expired Access Code' });
        }

        // Generate a special JWT for the Gatekeeper
        // NO USER ID, just role and event info
        const token = jwt.sign(
            {
                role: 'gatekeeper',
                eventName: accessCode.eventName,
                code: accessCode.code
            },
            process.env.JWT_SECRET,
            { expiresIn: '12h' } // Valid for a standard shift
        );

        res.json({
            success: true,
            token,
            eventName: accessCode.eventName,
            redirect: '/gatekeeper/scanner'
        });

    } catch (error) {
        console.error('Gatekeeper login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// @route   POST /api/gatekeepers/revoke
// @desc    Revoke a code (Organizer only)
router.post('/revoke', auth, async (req, res) => {
    try {
        const { codeId } = req.body;

        await AccessCode.findOneAndDelete({
            _id: codeId,
            organizerWallet: req.user.walletAddress.toLowerCase()
        });

        res.json({ success: true, message: 'Code revoked' });
    } catch (error) {
        console.error('Revoke code error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
