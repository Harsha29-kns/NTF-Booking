const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected. Deleting users...');
    await mongoose.connection.collection('users').deleteMany({});
    await mongoose.connection.collection('purchases').deleteMany({});
    console.log('Database cleared!');
    process.exit(0);
  })
  .catch(err => console.error(err));