const express = require('express');
const Purchase = require('../models/Purchase');
const Event = require('../models/Event');
const User = require('../models/User'); 
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/purchases - Create new purchase record
router.post('/', async (req, res) => {
  try {
    const {
      ticketId,
      buyerInfo,     
      walletAddress, 
      purchaseTxHash,
      eventName,
      organizer,
      eventDate,
      posterUrl,
      ticketImageUrl,
      price,
      seller
    } = req.body;

    const purchaseId = `PURCHASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const buyerWallet = walletAddress || req.user?.walletAddress || '0x0000000000000000000000000000000000000000';

    // Fetch User Profile logic
    let finalBuyerInfo = buyerInfo || {};
    // Check if buyerInfo is essentially empty
    const isBuyerInfoEmpty = !buyerInfo || (typeof buyerInfo === 'object' && Object.keys(buyerInfo).length === 0);
    
    let buyerUserId = null;

    if (isBuyerInfoEmpty && buyerWallet) {
      try {
        const user = await User.findOne({ walletAddress: buyerWallet.toLowerCase() });
        if (user) {
          buyerUserId = user._id;
          finalBuyerInfo = {
            name: user.username || 'Online Customer',
            // --- FIX: Use user.phone here ---
            phone: user.phone || '', 
            // --------------------------------
            address: 'Online Purchase',
            sellerPhone: ''
          };
        } else {
           finalBuyerInfo = {
             name: 'Guest User',
             phone: '',
             address: 'Online Purchase',
             sellerPhone: ''
           };
        }
      } catch (err) {
        console.log("Error fetching user profile for purchase:", err);
      }
    }

    const purchase = new Purchase({
      purchaseId,
      ticketId: parseInt(ticketId),
      contractAddress: process.env.CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      buyer: buyerWallet.toLowerCase(),
      buyerUser: buyerUserId, 
      seller: seller.toLowerCase(),
      price: price.toString(),
      purchaseTxHash: purchaseTxHash.toLowerCase(),
      eventName,
      organizer,
      eventDate: new Date(eventDate),
      posterUrl,
      ticketImageUrl,
      buyerInfo: finalBuyerInfo 
    });

    await purchase.save();

    // Update tickets count
    try {
      const event = await Event.findOne({ ticketId: parseInt(ticketId) });
      if (event && event.availableTickets > 0) {
        event.availableTickets = Math.max(0, event.availableTickets - 1);
        await event.save();
      }
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'Purchase recorded successfully',
      data: { purchase }
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase record'
    });
  }
});

// GET /api/purchases/ticket/:ticketId
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const purchaseDoc = await Purchase.findOne({ ticketId: parseInt(ticketId) });
    
    if (!purchaseDoc) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Convert to object so we can modify it
    let purchase = purchaseDoc.toObject();

    // --- FIX: Inject Live User Data for Verification ---
    if (purchase.buyerUser) {
      try {
        const user = await User.findById(purchase.buyerUser);
        if (user) {
          if (!purchase.buyerInfo) purchase.buyerInfo = {};
          
          // Overwrite with live data from User Profile
          purchase.buyerInfo.name = user.username || user.name || purchase.buyerInfo.name || 'Unknown';
          purchase.buyerInfo.phone = user.phone || purchase.buyerInfo.phone || 'N/A';
        }
      } catch (err) {
        console.warn("Error refreshing user details:", err);
      }
    }
    // ---------------------------------------------------
    
    res.json({
      success: true,
      data: { purchase }
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to get purchase' });
  }
});

// GET /api/purchases/user/:walletAddress
router.get('/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { status } = req.query;
    const purchases = await Purchase.getUserPurchases(walletAddress.toLowerCase(), status);
    res.json({ success: true, data: { purchases } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get user purchases' });
  }
});

// PUT /api/purchases/:purchaseId/status
router.put('/:purchaseId/status', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { status, txHash, additionalData } = req.body;
    const purchase = await Purchase.findOne({ purchaseId });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    
    await purchase.updateStatus(status, txHash, additionalData);
    res.json({ success: true, message: 'Status updated', data: { purchase } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// POST /api/purchases/:purchaseId/review
router.post('/:purchaseId/review', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { rating, review } = req.body;
    const purchase = await Purchase.findOne({ purchaseId });
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    
    await purchase.addReview(rating, review);
    res.json({ success: true, message: 'Review added', data: { purchase } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add review' });
  }
});

// GET /api/purchases/stats/:walletAddress
router.get('/stats/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { isSeller } = req.query;
    const stats = await Purchase.getStats(walletAddress.toLowerCase(), isSeller === 'true');
    res.json({ success: true, data: { stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
});

module.exports = router;