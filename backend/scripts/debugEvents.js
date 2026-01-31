const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const EntryLog = require('../models/EntryLog');
require('dotenv').config({ path: '../.env' });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nft-ticketing');
        console.log('✅ Connected to MongoDB');

        console.log('\n--- TARGET EVENT: rock12 ---');
        const event = await require('../models/Event').findOne({ eventName: { $regex: 'rock12', $options: 'i' } });
        if (event) {
            console.log(JSON.stringify({
                eventName: event.eventName,
                seller: event.seller,
                ticketId: event.ticketId,
                status: event.status
            }, null, 2));
        } else {
            console.log("Event 'rock12' NOT FOUND in DB.");
        }

        console.log('\n--- ALL EVENTS (Summary) ---');
        const allEvents = await require('../models/Event').find({}, 'eventName seller ticketId');
        console.log(JSON.stringify(allEvents, null, 2));


        console.log('\n--- ENTRY LOGS ---');
        const entries = await EntryLog.find({});
        console.log(JSON.stringify(entries.map(e => ({
            eventName: e.eventName,
            ticketId: e.ticketId,
            scanResult: e.scanResult
        })), null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

run();
