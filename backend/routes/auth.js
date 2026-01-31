const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyWalletSignature } = require('../middleware/auth');
const { sendOtpEmail } = require('../services/emailService'); // Import Email Service

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

// ============================================
// 2FA OTP Logic for Ticket Access
// ============================================

// Temporary In-Memory OTP Store (Production should use Redis)
// Format: { walletAddress: { code: "123456", expires: 1234567890 } }
const otpStore = {};

// POST /api/auth/generate-qr-otp
router.post('/generate-qr-otp', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ success: false, message: 'Wallet Address required' });

    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP
    otpStore[walletAddress.toLowerCase()] = { code: otp, expires };

    // SEND REAL EMAIL
    const emailSent = await sendOtpEmail(user.email, otp);

    if (emailSent) {
      console.log(`[2FA] OTP Email sent to ${user.email}`);
      res.json({
        success: true,
        message: `OTP Code sent to ${user.email}`,
        debug: 'Check Email'
      });
    } else {
      console.error('[2FA] Failed to send email');
      res.status(500).json({ success: false, message: 'Failed to send OTP Email. Check server logs.' });
    }

  } catch (error) {
    console.error('OTP Gen Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate OTP' });
  }
});

// POST /api/auth/verify-qr-otp
router.post('/verify-qr-otp', async (req, res) => {
  try {
    const { walletAddress, otp, ticketId } = req.body;

    // 1. Validate Input
    if (!walletAddress || !otp || !ticketId) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    // 2. Retrieve OTP
    const stored = otpStore[walletAddress.toLowerCase()];

    // 3. Check Validity
    if (!stored) {
      return res.status(400).json({ success: false, message: 'No OTP requested or expired' });
    }
    if (Date.now() > stored.expires) {
      delete otpStore[walletAddress.toLowerCase()]; // Cleanup
      return res.status(400).json({ success: false, message: 'OTP Expired' });
    }
    if (stored.code !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP Code' });
    }

    // 4. Success! Generate Signed Access Token (qrToken)
    // This token proves 2FA was passed and allows entry for this specific ticket
    const qrToken = jwt.sign(
      {
        type: 'ACCESS_TOKEN',
        wallet: walletAddress.toLowerCase(),
        ticketId: ticketId,
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: '5m' } // Token valid for 5 mins for scanning
    );

    // 5. Cleanup OTP (One-time use)
    delete otpStore[walletAddress.toLowerCase()];

    console.log(`[2FA SUCCESS] Verified OTP for ${walletAddress}. Token Issued.`);

    res.json({
      success: true,
      message: '2FA Verified',
      data: { qrToken }
    });

  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ success: false, message: 'Verification Failed' });
  }
});

module.exports = router;
