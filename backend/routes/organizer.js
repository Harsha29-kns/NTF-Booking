const express = require('express');
const { ethers } = require('ethers'); // Import ethers for Wei conversion
const GatekeeperCode = require('../models/GatekeeperCode');
const Purchase = require('../models/Purchase');
const EntryLog = require('../models/EntryLog');
const Event = require('../models/Event');
const { authenticateToken } = require('../middleware/auth');
const { getContractReadOnly } = require('../utils/web3');

const router = express.Router();

// POST /api/organizer/gatekeeper/generate - Generate new access code
router.post('/gatekeeper/generate', authenticateToken, async (req, res) => {
    try {
        const { eventId, notes } = req.body;
        const organizerAddress = req.user.walletAddress;

        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'Event ID required'
            });
        }

        // Verify event exists and user is the organizer
        const contract = getContractReadOnly();
        const ticket = await contract.getTicket(eventId);

        if (ticket.ticketId.toString() === '0') {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if user is the organizer
        if (ticket.organizer.toLowerCase() !== organizerAddress.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'Only the event organizer can generate access codes'
            });
        }

        // Generate unique code
        let code;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            code = GatekeeperCode.generateCode();
            const existing = await GatekeeperCode.findOne({ code });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate unique code'
            });
        }

        // Calculate expiration (event date + 2 hours buffer)
        const eventDate = new Date(Number(ticket.eventDate) * 1000);
        const expiresAt = new Date(eventDate.getTime() + (2 * 60 * 60 * 1000));

        // Create gatekeeper code
        const gatekeeperCode = new GatekeeperCode({
            code,
            eventId,
            eventName: ticket.eventName,
            eventDate,
            createdBy: organizerAddress.toLowerCase(),
            expiresAt,
            notes: notes || ''
        });

        await gatekeeperCode.save();

        res.status(201).json({
            success: true,
            message: 'Access code generated',
            data: {
                code: gatekeeperCode.code,
                eventId: gatekeeperCode.eventId,
                eventName: gatekeeperCode.eventName,
                eventDate: gatekeeperCode.eventDate,
                expiresAt: gatekeeperCode.expiresAt,
                notes: gatekeeperCode.notes
            }
        });
    } catch (error) {
        console.error('Code generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate access code'
        });
    }
});

// GET /api/organizer/gatekeeper/codes - List all codes for organizer's events
router.get('/gatekeeper/codes', authenticateToken, async (req, res) => {
    try {
        const organizerAddress = req.user.walletAddress;

        // Find all codes created by this organizer
        const codes = await GatekeeperCode.find({
            createdBy: organizerAddress.toLowerCase()
        }).sort({ createdAt: -1 });

        // Format response
        const formattedCodes = codes.map(code => ({
            id: code._id,
            code: code.code,
            eventId: code.eventId,
            eventName: code.eventName,
            eventDate: code.eventDate,
            expiresAt: code.expiresAt,
            isActive: code.isActive,
            isExpired: new Date() > code.expiresAt,
            isUsed: !!code.deviceFingerprint,
            usedAt: code.usedAt,
            lastUsedAt: code.lastUsedAt,
            scanCount: code.scanCount,
            notes: code.notes,
            createdAt: code.createdAt
        }));

        res.json({
            success: true,
            data: {
                codes: formattedCodes,
                total: formattedCodes.length
            }
        });
    } catch (error) {
        console.error('Codes fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch access codes'
        });
    }
});

// GET /api/organizer/gatekeeper/codes/:eventId - Get codes for specific event
router.get('/gatekeeper/codes/:eventId', authenticateToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const organizerAddress = req.user.walletAddress;

        // Find codes for this event created by this organizer
        const codes = await GatekeeperCode.find({
            eventId,
            createdBy: organizerAddress.toLowerCase()
        }).sort({ createdAt: -1 });

        // Format response
        const formattedCodes = codes.map(code => ({
            id: code._id,
            code: code.code,
            eventId: code.eventId,
            eventName: code.eventName,
            eventDate: code.eventDate,
            expiresAt: code.expiresAt,
            isActive: code.isActive,
            isExpired: new Date() > code.expiresAt,
            isUsed: !!code.deviceFingerprint,
            usedAt: code.usedAt,
            lastUsedAt: code.lastUsedAt,
            scanCount: code.scanCount,
            notes: code.notes,
            createdAt: code.createdAt
        }));

        res.json({
            success: true,
            data: {
                codes: formattedCodes,
                total: formattedCodes.length
            }
        });
    } catch (error) {
        console.error('Event codes fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch event codes'
        });
    }
});

// DELETE /api/organizer/gatekeeper/revoke/:codeId - Revoke access code
router.delete('/gatekeeper/revoke/:codeId', authenticateToken, async (req, res) => {
    try {
        const { codeId } = req.params;
        const organizerAddress = req.user.walletAddress;

        // Find the code
        const gatekeeperCode = await GatekeeperCode.findById(codeId);

        if (!gatekeeperCode) {
            return res.status(404).json({
                success: false,
                message: 'Access code not found'
            });
        }

        // Verify ownership
        if (gatekeeperCode.createdBy !== organizerAddress.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'You can only revoke your own access codes'
            });
        }

        // Revoke the code
        await gatekeeperCode.revoke();

        res.json({
            success: true,
            message: 'Access code revoked',
            data: {
                code: gatekeeperCode.code
            }
        });
    } catch (error) {
        console.error('Code revocation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke access code'
        });
    }
});

// PUT /api/organizer/gatekeeper/reset-device/:codeId - Reset device binding
router.put('/gatekeeper/reset-device/:codeId', authenticateToken, async (req, res) => {
    try {
        const { codeId } = req.params;
        const organizerAddress = req.user.walletAddress;

        // Find the code
        const gatekeeperCode = await GatekeeperCode.findById(codeId);

        if (!gatekeeperCode) {
            return res.status(404).json({
                success: false,
                message: 'Access code not found'
            });
        }

        // Verify ownership
        if (gatekeeperCode.createdBy !== organizerAddress.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'You can only reset your own access codes'
            });
        }

        // Reset device binding
        gatekeeperCode.deviceFingerprint = null;
        gatekeeperCode.usedAt = null;
        await gatekeeperCode.save();

        res.json({
            success: true,
            message: 'Device binding reset',
            data: {
                code: gatekeeperCode.code
            }
        });
    } catch (error) {
        console.error('Device reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset device binding'
        });
    }
});

// GET /api/organizer/event-analytics/:eventName - Get comprehensive analytics (Guest List)
router.get('/event-analytics/:eventName', authenticateToken, async (req, res) => {
    try {
        const { eventName } = req.params;
        const organizerAddress = req.user.walletAddress.toLowerCase();

        // 1. Verify Event Ownership
        const event = await Event.findOne({ eventName: eventName });
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        if (event.seller.toLowerCase() !== organizerAddress) {
            return res.status(403).json({ success: false, message: 'Not authorized for this event' });
        }

        // 2. Fetch All Purchases for this Event
        const purchases = await Purchase.find({ eventName: eventName }).sort({ ticketId: 1 });

        // 3. Fetch All Successful Entries for this Event
        const entries = await EntryLog.find({
            eventName: eventName,
            scanResult: 'SUCCESS'
        });

        // Create a map of TicketID -> EntryDetails for fast lookup
        const entryMap = {};
        entries.forEach(entry => {
            entryMap[entry.ticketId] = entry;
        });

        // 4. Combine Data into Guest List
        const guestList = purchases.map(p => {
            const entry = entryMap[p.ticketId];
            return {
                ticketId: p.ticketId,
                buyerWallet: p.buyer,
                buyerName: p.buyerInfo?.name || 'Unknown',
                buyerPhone: p.buyerInfo?.phone || 'N/A',
                purchaseDate: p.purchaseDate,
                price: p.price,
                isUsed: !!entry,
                entryTime: entry ? entry.scanTime : null,
                gatekeeper: entry ? entry.gatekeeperAddress : null,
                isTransferred: p.buyer.toLowerCase() !== p.buyerInfo?.originalBuyer?.toLowerCase() // Basic check, better handled by tracking transfers
            };
        });

        // Calculate Stats (Revenue in Wei -> ETH)
        const totalRevenueWei = purchases.reduce((acc, curr) => {
            return acc + (curr.price ? BigInt(curr.price) : 0n);
        }, 0n);

        const stats = {
            totalSold: purchases.length,
            totalEntered: entries.length,
            revenue: ethers.formatEther(totalRevenueWei), // Convert Wei to ETH string
            attendanceRate: purchases.length > 0 ? (entries.length / purchases.length) * 100 : 0
        };

        res.json({
            success: true,
            data: {
                event: {
                    name: event.eventName,
                    date: event.eventDate,
                    totalTickets: event.totalTickets,
                    posterUrl: event.posterUrl
                },
                stats,
                guests: guestList
            }
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
});

module.exports = router;
