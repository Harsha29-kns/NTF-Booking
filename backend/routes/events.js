const express = require('express');
const Event = require('../models/Event');
const { authenticateToken, requireOrganizer, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/events - Get all events with filtering and search
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      city, 
      search, 
      featured,
      sortBy = 'eventDate',
      sortOrder = 'asc'
    } = req.query;
    
    // Build query
    const query = { status: 'active' };
    
    if (category) query.category = category;
    if (city) query['venue.city'] = new RegExp(city, 'i');
    if (featured === 'true') query.featured = true;
    
    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Sort options
    const sortOptions = {};
    if (search) {
      sortOptions.score = { $meta: 'textScore' };
    }
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const events = await Event.find(query, search ? { score: { $meta: 'textScore' } } : {})
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('seller', 'username walletAddress organizerInfo');
    
    const total = await Event.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get events'
    });
  }
});

// GET /api/events/available - Get available events (not sold)
router.get('/available', async (req, res) => {
  try {
    const events = await Event.getAvailable();
    
    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('Get available events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available events'
    });
  }
});

// GET /api/events/search - Search events
router.get('/search', async (req, res) => {
  try {
    const { q, filters = {} } = req.query;
    
    const events = await Event.search(q, filters);
    
    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search events'
    });
  }
});

// GET /api/events/:ticketId - Get event by ticket ID
router.get('/:ticketId', optionalAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const event = await Event.findOne({ ticketId: parseInt(ticketId) })
      .populate('seller', 'username walletAddress organizerInfo');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Increment views if user is not the seller
    if (!req.user || req.user.walletAddress !== event.seller) {
      await event.incrementViews();
    }
    
    res.json({
      success: true,
      data: { event }
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get event'
    });
  }
});

// POST /api/events - Create new event (sync with blockchain)
router.post('/', authenticateToken, requireOrganizer, async (req, res) => {
  try {
    const {
      ticketId,
      contractAddress,
      eventName,
      organizer,
      eventDate,
      saleEndDate,
      price,
      posterUrl,
      ticketImageUrl,
      description,
      category,
      venue,
      capacity,
      ageRestriction,
      tags
    } = req.body;
    
    // Check if event already exists
    const existingEvent = await Event.findOne({ ticketId });
    if (existingEvent) {
      return res.status(400).json({
        success: false,
        message: 'Event already exists'
      });
    }
    
    // Create event
    const event = new Event({
      ticketId,
      contractAddress: contractAddress.toLowerCase(),
      seller: req.user.walletAddress,
      eventName,
      organizer,
      eventDate: new Date(eventDate),
      saleEndDate: new Date(saleEndDate),
      price,
      posterUrl,
      ticketImageUrl,
      description,
      category,
      venue,
      capacity,
      ageRestriction,
      tags
    });
    
    await event.save();
    
    // Update user stats
    await req.user.updateStats('event_created');
    
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event }
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event'
    });
  }
});

// PUT /api/events/:ticketId - Update event (only metadata, not blockchain data)
router.put('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const {
      description,
      category,
      venue,
      capacity,
      ageRestriction,
      tags,
      featured
    } = req.body;
    
    const event = await Event.findOne({ ticketId: parseInt(ticketId) });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check ownership
    if (event.seller !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }
    
    // Update allowed fields
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (venue !== undefined) updateData.venue = venue;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (ageRestriction !== undefined) updateData.ageRestriction = ageRestriction;
    if (tags !== undefined) updateData.tags = tags;
    if (featured !== undefined && req.user.isOrganizer) updateData.featured = featured;
    
    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event: updatedEvent }
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event'
    });
  }
});

// DELETE /api/events/:ticketId - Delete event (soft delete)
router.delete('/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const event = await Event.findOne({ ticketId: parseInt(ticketId) });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check ownership
    if (event.seller !== req.user.walletAddress) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }
    
    // Soft delete by changing status
    event.status = 'cancelled';
    await event.save();
    
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
});

// GET /api/events/categories/list - Get available categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Event.distinct('category');
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories'
    });
  }
});

// GET /api/events/featured - Get featured events
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const events = await Event.find({
      featured: true,
      status: 'active',
      eventDate: { $gt: new Date() }
    })
    .sort({ eventDate: 1 })
    .limit(parseInt(limit))
    .populate('seller', 'username walletAddress organizerInfo');
    
    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('Get featured events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured events'
    });
  }
});

module.exports = router;

