const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyWalletSignature } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/login - Login with wallet signature
// CHANGED: Removed findOrCreate. Now strictly checks if user exists.
router.post('/login', verifyWalletSignature, async (req, res) => {
  try {
    const { walletAddress } = req;

    // Find user (DO NOT CREATE)
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    // If user doesn't exist, return 404 so frontend knows to show Register Modal
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not registered',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          username: user.username,
          email: user.email,
          phone: user.phone, // <--- ADDED
          isOrganizer: user.isOrganizer,
          profileImage: user.profileImage,
          stats: user.stats
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// POST /api/auth/register - Register new user with additional info
router.post('/register', verifyWalletSignature, async (req, res) => {
  try {
    const { walletAddress } = req;
    // We now accept isOrganizer from the frontend registration form
    const { username, email, phone, isOrganizer, organizerInfo } = req.body; // <--- ADDED phone

    // Check if user already exists
    const existingUser = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Validate username uniqueness
    if (username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Validate email uniqueness
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Create user
    const userData = {
      username: username || `User ${walletAddress.slice(0, 6)}`, // Default username if empty
      email,
      phone, // <--- ADDED
      isOrganizer: isOrganizer === true, // Ensure boolean
      organizerInfo: isOrganizer ? organizerInfo : undefined
    };

    const user = new User(userData);
    user.walletAddress = walletAddress.toLowerCase();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          username: user.username,
          email: user.email,
          phone: user.phone, // <--- ADDED
          isOrganizer: user.isOrganizer,
          profileImage: user.profileImage,
          stats: user.stats
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// POST /api/auth/verify - Verify token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      message: 'Token valid',
      data: {
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          username: user.username,
          email: user.email,
          phone: user.phone, // <--- ADDED
          isOrganizer: user.isOrganizer,
          profileImage: user.profileImage,
          stats: user.stats
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// POST /api/auth/refresh - Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Generate new token
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Token refreshed',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});
// GET /api/auth/user/:walletAddress - Get public user info (for Organizers)
router.get('/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (!user) {
      return res.json({ success: true, username: 'Unknown User' });
    }

    res.json({
      success: true,
      username: user.username,
      email: user.email // Optional: if you want to show email too
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
