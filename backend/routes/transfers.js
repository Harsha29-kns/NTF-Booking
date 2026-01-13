const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');

// ✅ FIXED IMPORT: Import 'authenticateToken' and rename it to 'auth'
const { authenticateToken: auth } = require('../middleware/auth');

// @route   POST /api/transfers/request
// @desc    Submit a new transfer request
// @access  Private
router.post('/request', auth, async (req, res) => {
  try {
    const { ticketId, receiverAddress, reason, eventName } = req.body;
    
    // 1. Validate inputs
    if (!ticketId || !receiverAddress || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (receiverAddress.toLowerCase() === req.user.walletAddress.toLowerCase()) {
      return res.status(400).json({ message: 'Cannot transfer ticket to yourself' });
    }

    // 2. Check for existing pending request
    const existingRequest = await TransferRequest.findOne({
      ticketId: ticketId.toString(),
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'A transfer request is already pending for this ticket' });
    }

    // 3. Create Request
    const newRequest = new TransferRequest({
      ticketId: ticketId.toString(),
      eventName: eventName || 'Unknown Event',
      senderAddress: req.user.walletAddress, // Ensure using walletAddress from user object
      receiverAddress: receiverAddress,
      reason: reason
    });

    await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Transfer request submitted successfully',
      data: newRequest
    });

  } catch (error) {
    console.error('Create transfer request error:', error);
    res.status(500).json({ message: 'Server error creating request' });
  }
});

// @route   GET /api/transfers/my-requests
// @desc    Get all requests made by the current user
router.get('/my-requests', auth, async (req, res) => {
  try {
    const requests = await TransferRequest.find({ 
      senderAddress: req.user.walletAddress 
    }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Fetch my requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/transfers/pending
// @desc    Get all pending requests (Admin/Organizer only)
router.get('/pending', auth, async (req, res) => {
  try {
    // Optional: Add check for organizer role here
    // if (!req.user.isOrganizer) return res.status(403).json({ message: "Unauthorized" });

    const requests = await TransferRequest.find({ status: 'pending' })
      .sort({ createdAt: 1 });

    res.json(requests);
  } catch (error) {
    console.error('Fetch pending requests error:', error);
    res.status(500).json({ message: 'Server error fetching pending requests' });
  }
});

// @route   POST /api/transfers/approve
// @desc    Mark request as approved
router.post('/approve', auth, async (req, res) => {
  try {
    const { requestId, txHash } = req.body;

    if (!requestId || !txHash) {
      return res.status(400).json({ message: 'Request ID and Transaction Hash required' });
    }

    const request = await TransferRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'approved';
    request.txHash = txHash;
    request.processedAt = Date.now();
    
    await request.save();

    res.json({ success: true, message: 'Request marked as approved' });

  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Server error approving request' });
  }
});

// @route   POST /api/transfers/reject
// @desc    Reject a transfer request
router.post('/reject', auth, async (req, res) => {
  try {
    const { requestId, adminComment } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID required' });
    }

    const request = await TransferRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'rejected';
    request.adminComment = adminComment || 'Rejected by organizer';
    request.processedAt = Date.now();
    
    await request.save();

    res.json({ success: true, message: 'Request rejected' });

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Server error rejecting request' });
  }
});

module.exports = router;