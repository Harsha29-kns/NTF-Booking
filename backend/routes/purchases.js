const express = require('express');
const Purchase = require('../models/Purchase');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// LOG TO CONFIRM FILE LOADED
console.log("✅ purchases.js route file loaded");

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

    console.log(`📝 [Purchase API] Creating purchase for Ticket #${ticketId}, Tx: ${purchaseTxHash}`);

    const purchaseId = `PURCHASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const buyerWallet = walletAddress || req.user?.walletAddress || '0x0000000000000000000000000000000000000000';

    // Fetch User Profile logic
    let finalBuyerInfo = buyerInfo || {};
    const isBuyerInfoEmpty = !buyerInfo || (typeof buyerInfo === 'object' && Object.keys(buyerInfo).length === 0);

    let buyerUserId = null;

    if (isBuyerInfoEmpty && buyerWallet) {
      try {
        const user = await User.findOne({ walletAddress: buyerWallet.toLowerCase() });
        if (user) {
          buyerUserId = user._id;
          finalBuyerInfo = {
            name: user.username || 'Online Customer',
            phone: user.phone || '',
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
    console.log(`✅ [Purchase API] Saved purchase ${purchaseId} for Ticket #${ticketId}`);

    // Update tickets count
    try {
      const event = await Event.findOne({ ticketId: parseInt(ticketId) });
      if (event && event.availableTickets > 0) {
        event.availableTickets = Math.max(0, event.availableTickets - 1);
        await event.save();
      }
    } catch (e) { }

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

// ==========================================
//  FIXED ROUTE FOR QR VERIFICATION
// ==========================================
router.get('/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    console.log(`🔍 [DEBUG] Searching for Ticket ID: ${ticketId}`);

    // TRICK: Use .collection.findOne() to bypass Mongoose Schema rules.
    // We search for BOTH string "5" and number 5 directly in the DB.
    const purchaseDoc = await Purchase.collection.findOne({
      $or: [
        { ticketId: parseInt(ticketId) },   // Try Number: 5
        { ticketId: ticketId.toString() }   // Try String: "5"
      ]
    });

    if (!purchaseDoc) {
      console.log(`❌ [DEBUG] Ticket #${ticketId} NOT found in DB.`);
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    console.log(`✅ [DEBUG] Found Purchase:`, purchaseDoc.purchaseId);

    // Since we used raw collection, we don't have .toObject() or virtuals.
    let purchase = purchaseDoc;

    // Manually inject user info
    if (purchase.buyerUser) {
      try {
        const user = await User.findById(purchase.buyerUser);
        if (user) {
          if (!purchase.buyerInfo) purchase.buyerInfo = {};

          purchase.buyerInfo.name = user.username || user.name || purchase.buyerInfo.name || 'Unknown';
          purchase.buyerInfo.phone = user.phone || purchase.buyerInfo.phone || 'N/A';
        }
      } catch (err) {
        console.warn("Error refreshing user details:", err);
      }
    }

    res.json({
      success: true,
      data: { purchase }
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to get purchase' });
  }
});

// ✅ NEW: GET /api/purchases/by-wallet/:walletAddress/ticket/:ticketId
// Fetch purchase details for a specific wallet and ticket (for transfer history)
router.get('/by-wallet/:walletAddress/ticket/:ticketId', async (req, res) => {
  try {
    const { walletAddress, ticketId } = req.params;
    console.log(`🔍 [DEBUG] Searching for wallet ${walletAddress} and ticket ${ticketId}`);

    // Search for purchase by wallet address and ticket ID
    const purchaseDoc = await Purchase.collection.findOne({
      buyer: walletAddress.toLowerCase(),
      $or: [
        { ticketId: parseInt(ticketId) },
        { ticketId: ticketId.toString() }
      ]
    });

    if (!purchaseDoc) {
      console.log(`❌ [DEBUG] No purchase found for wallet ${walletAddress} and ticket ${ticketId}`);
      return res.status(404).json({
        success: false,
        message: 'Purchase not found for this wallet and ticket combination'
      });
    }

    console.log(`✅ [DEBUG] Found Purchase:`, purchaseDoc.purchaseId);

    let purchase = purchaseDoc;

    // Manually inject user info if available
    if (purchase.buyerUser) {
      try {
        const user = await User.findById(purchase.buyerUser);
        if (user) {
          if (!purchase.buyerInfo) purchase.buyerInfo = {};
          purchase.buyerInfo.name = user.username || user.name || purchase.buyerInfo.name || 'Unknown';
          purchase.buyerInfo.phone = user.phone || purchase.buyerInfo.phone || 'N/A';
        }
      } catch (err) {
        console.warn("Error refreshing user details:", err);
      }
    }

    res.json({
      success: true,
      data: { purchase }
    });
  } catch (error) {
    console.error('Get purchase by wallet error:', error);
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