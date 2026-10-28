const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

// Configure Google DNS to reliably resolve MongoDB Atlas SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const defaultAtlasUri = 'mongodb+srv://lokesh:aashvi@cluster0.dp59nnf.mongodb.net/expense_splitter?retryWrites=true&w=majority&appName=Cluster0';

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || process.env.ATLASDB_URL || defaultAtlasUri,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_expense_splitter_2026_secure',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;
