const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

// Connect to MongoDB and start HTTP server
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(`🚀 Expense Splitter Backend Server is running!`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`⚙️  Environment: ${config.nodeEnv}`);
      console.log(`🛡️  CORS allowed origin: ${config.clientUrl}`);
      console.log(`===============================================`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Unhandled Rejection] Error: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
