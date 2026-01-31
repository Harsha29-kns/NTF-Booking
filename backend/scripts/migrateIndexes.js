const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nft-ticketing');
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('purchases');

        // Drop the old unique index on ticketId
        try {
            await collection.dropIndex('ticketId_1');
            console.log('✅ Dropped old unique index on ticketId');
        } catch (err) {
            if (err.code === 27) {
                console.log('ℹ️ Index ticketId_1 does not exist (already dropped or never created)');
            } else {
                throw err;
            }
        }

        console.log('\n✅ Migration complete! Restart the backend to apply new schema.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        mongoose.connection.close();
    }
};

run();
