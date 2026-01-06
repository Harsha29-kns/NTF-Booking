const express = require('express');
const User = require('../models/User');
const { authenticateToken, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, bio, profileImage, preferences, organizerInfo } = req.body;
    
    // Validate username uniqueness if provided
    if (username && username !== req.user.username) {
      const usernameExists = await User.findOne({ 
        username, 
        _id: { $ne: req.user._id } 
      });
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }
    
    // Validate email uniqueness if provided
    if (email && email !== req.user.email) {
      const emailExists = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }
    
    // Update user
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (preferences !== undefined) updateData.preferences = { ...req.user.preferences, ...preferences };
    if (organizerInfo !== undefined && req.user.isOrganizer) {
      updateData.organizerInfo = { ...req.user.organizerInfo, ...organizerInfo };
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// GET /api/users/:walletAddress - Get user by wallet address
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    }).select('-email -preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

// GET /api/users/:walletAddress/stats - Get user statistics
router.get('/:walletAddress/stats', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    }).select('stats isOrganizer');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { 
        stats: user.stats,
        isOrganizer: user.isOrganizer
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user stats'
    });
  }
});

// GET /api/users/:walletAddress/events - Get user's events (created or purchased)
router.get('/:walletAddress/events', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { type = 'all' } = req.query; // 'created', 'purchased', 'all'
    
    const Event = require('../models/Event');
    const Purchase = require('../models/Purchase');
    
    let events = [];
    
    if (type === 'created' || type === 'all') {
      const createdEvents = await Event.find({ 
        seller: walletAddress.toLowerCase() 
      }).sort({ createdAt: -1 });
      events = [...events, ...createdEvents.map(e => ({ ...e.toObject(), type: 'created' }))];
    }
    
    if (type === 'purchased' || type === 'all') {
      const purchases = await Purchase.find({ 
        buyer: walletAddress.toLowerCase() 
      }).sort({ purchaseDate: -1 });
      events = [...events, ...purchases.map(p => ({ ...p.toObject(), type: 'purchased' }))];
    }
    
    // Sort by date
    events.sort((a, b) => {
      const dateA = a.createdAt || a.purchaseDate;
      const dateB = b.createdAt || b.purchaseDate;
      return new Date(dateB) - new Date(dateA);
    });
    
    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user events'
    });
  }
});

// POST /api/users/become-organizer - Become an organizer
router.post('/become-organizer', authenticateToken, async (req, res) => {
  try {
    const { companyName, website, description } = req.body;
    
    if (req.user.isOrganizer) {
      return res.status(400).json({
        success: false,
        message: 'User is already an organizer'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        isOrganizer: true,
        organizerInfo: {
          companyName,
          website,
          description,
          verified: false
        }
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Successfully became an organizer',
      data: { user }
    });
  } catch (error) {
    console.error('Become organizer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to become organizer'
    });
  }
});

// GET /api/users/organizers - Get list of organizers
router.get('/organizers/list', async (req, res) => {
  try {
    const { page = 1, limit = 20, verified } = req.query;
    
    const query = { isOrganizer: true, isActive: true };
    if (verified !== undefined) {
      query['organizerInfo.verified'] = verified === 'true';
    }
    
    const organizers = await User.find(query)
      .select('username walletAddress organizerInfo stats createdAt')
      .sort({ 'organizerInfo.verified': -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        organizers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get organizers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organizers'
    });
  }
});

module.exports = router;

