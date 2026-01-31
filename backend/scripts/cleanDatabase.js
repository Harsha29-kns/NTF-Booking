const mongoose = require('mongoose');
const Purchase = require('../models/Purchase');
const Event = require('../models/Event');
require('dotenv').config({ path: '../.env' });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nft-ticketing');
        console.log('✅ Connected to MongoDB');

        // Delete all purchases
        const purchaseResult = await Purchase.deleteMany({});
        console.log(`🗑️ Deleted ${purchaseResult.deletedCount} purchase records`);

        // Delete all events
        const eventResult = await Event.deleteMany({});
        console.log(`🗑️ Deleted ${eventResult.deletedCount} event records`);

        console.log('\n✅ Database cleaned! You can now restart the backend to re-sync from blockchain.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        mongoose.connection.close();
    }
};

run();
