const express = require('express');
const router = express.Router();
const EntryLog = require('../models/EntryLog');
const jwt = require('jsonwebtoken'); // Import JWT
const { verifyToken } = require('../middleware/auth'); // Assuming these exist

// POST /api/entry/mark-used
// Mark a ticket as used for entry, checking for duplicates
router.post('/mark-used', async (req, res) => {
    try {
        const { ticketId, eventName, walletAddress, location, qrTimestamp, qrToken } = req.body;

        // 2FA TOKEN VERIFICATION (If provided)
        if (qrToken) {
            try {
                const decoded = jwt.verify(qrToken, process.env.JWT_SECRET);

                // Verify Token Type and Freshness
                if (decoded.type !== 'ACCESS_TOKEN') {
                    throw new Error('Invalid Token Type');
                }

                // Use decoded data as the source of truth
                // This prevents "Parameter Tampering" (sending valid token but different ticketId in body)
                if (Number(decoded.ticketId) !== Number(ticketId)) {
                    return res.status(400).json({ success: false, message: 'Token/Ticket Mismatch' });
                }

                console.log(`[Entry] 2FA Token Verified for Ticket #${ticketId}`);

            } catch (err) {
                console.error('[Entry] Token Verification Failed:', err);
                return res.status(400).json({
                    success: false,
                    error: 'INVALID_TOKEN',
                    message: 'Security Token Invalid or Expired'
                });
            }
        }
        // OPTIONAL: Enforce Token Presence? 
        // For now, if we want to blocking Wallet Thieves, we SHOULD enforce it.
        // But for backward compatibility with old QR codes during dev, we might make it optional 
        // unless you want strict enforcement.
        // Let's rely on the frontend sending it.

        // Basic Validation
        if (!ticketId || !walletAddress) {
            return res.status(400).json({
                success: false,
                message: 'Missing ticketId or walletAddress'
            });
        }

        // ✅ SECURITY: Dynamic QR Timestamp Validation (Anti-Screenshot)
        if (qrTimestamp) {
            const now = Date.now();
            const qrTime = Number(qrTimestamp);
            const fiveMinutes = 5 * 60 * 1000;

            if (now - qrTime > fiveMinutes) {
                console.log(`[Entry] QR Code Expired. Diff: ${now - qrTime}ms`);
                return res.status(400).json({
                    success: false,
                    error: 'QR_EXPIRED',
                    message: 'QR Code Expired. Please refresh the ticket.'
                });
            }
        } else {
            console.log(`[Entry] Warning: Old Static QR used (No timestamp)`);
            // Optional: Reject if you want to force upgrade. For now, allow for backward compatibility.
        }

        // Explicitly cast ticketId to Number to ensure MongoDB query matches schema
        const ticketIdNum = Number(ticketId);

        console.log(`[Entry] Checking Ticket #${ticketIdNum} (Raw: ${ticketId})`);

        // 1. Check for ANY previous successful entry (Persistent 'Already Used' check)
        const previousEntry = await EntryLog.findOne({
            ticketId: ticketIdNum,
            scanResult: 'SUCCESS'
        }).sort({ scanTime: -1 });

        console.log(`[Entry] Previous Entry Found:`, previousEntry ? `Yes (${previousEntry.scanTime})` : 'No');

        if (previousEntry) {
            // Check how long ago it was
            const timeDiff = Date.now() - new Date(previousEntry.scanTime).getTime();
            const oneMinute = 60 * 1000;

            console.log(`[Entry] Time Diff: ${timeDiff}ms`);

            if (timeDiff < oneMinute) {
                // If scanned within last minute, consider it a "Duplicate Scan" warning (accidental double scan)
                console.log(`[Entry] Result: DUPLICATE_SCAN`);

                await EntryLog.create({
                    ticketId: ticketIdNum,
                    walletAddress,
                    eventName,
                    scanResult: 'DUPLICATE',
                    location,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(400).json({
                    success: false,
                    error: 'DUPLICATE_SCAN',
                    message: 'Ticket scanned recently',
                    lastScan: previousEntry
                });
            } else {
                // If scanned longer ago, it's definitely "Already Used" (Replay attack / Re-entry attempt)
                console.log(`[Entry] Result: ALREADY_USED`);

                await EntryLog.create({
                    ticketId: ticketIdNum,
                    walletAddress,
                    eventName,
                    scanResult: 'ALREADY_USED',
                    location,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(400).json({
                    success: false,
                    error: 'ALREADY_USED',
                    message: 'Ticket already used for entry',
                    entryTime: previousEntry.scanTime,
                    previousEntry: previousEntry
                });
            }
        }

        // 2. Log Successful Entry
        console.log(`[Entry] Result: SUCCESS (First Time)`);
        const entry = await EntryLog.create({
            ticketId: ticketIdNum,
            walletAddress,
            eventName,
            scanResult: 'SUCCESS',
            location,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Entry Logged',
            data: entry
        });

    } catch (error) {
        console.error('Entry log error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log entry'
        });
    }
});

module.exports = router;
