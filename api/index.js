const app = require('../server/src/app');
const { connectDB } = require('../server/src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless DB Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed in serverless function',
      error: error.message
    });
  }
};
