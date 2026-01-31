const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const EntryLog = require('../models/EntryLog');

const resetEntries = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nft-ticketing';
        console.log(`Using MongoDB URI: ${mongoURI}`);
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const count = await EntryLog.countDocuments({});
        console.log(`Found ${count} entry logs.`);

        if (count > 0) {
            await EntryLog.deleteMany({});
            console.log('✅ All entry logs have been cleared.');
        } else {
            console.log('ℹ️ No entry logs to clear.');
        }

    } catch (error) {
        console.error('❌ Error resetting entries:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

resetEntries();
