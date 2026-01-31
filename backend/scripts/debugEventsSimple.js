const mongoose = require('mongoose');
const Event = require('../models/Event');
require('dotenv').config({ path: '../.env' });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nft-ticketing');
        console.log('✅ Connected');

        const events = await Event.find({});
        console.table(events.map(e => ({
            name: e.eventName,
            seller: e.seller,
            ticketId: e.ticketId
        })));

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

run();
