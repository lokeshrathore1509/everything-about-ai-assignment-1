const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    // Provide sensible defaults for local development if missing
    if (envVar === 'MONGODB_URI') {
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/expense_splitter';
    } else if (envVar === 'JWT_SECRET') {
      process.env.JWT_SECRET = 'super_secret_jwt_key_expense_splitter_2026_secure';
    }
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_splitter',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_expense_splitter_2026_secure',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = config;
