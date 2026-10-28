const mongoose = require('mongoose');
const config = require('./env');

let cachedConn = null;

const connectDB = async () => {
  // If already connected in serverless container, reuse existing connection
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    if (!cachedConn) {
      cachedConn = await mongoose.connect(config.mongoUri, {
        bufferCommands: false
      });
      console.log(`[Database] MongoDB Connected: ${cachedConn.connection.host}`);
    }
    return cachedConn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    if (config.nodeEnv !== 'test' && !process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    cachedConn = null;
    console.log('[Database] MongoDB connection closed');
  } catch (error) {
    console.error(`[Database Error] Disconnect failed: ${error.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
