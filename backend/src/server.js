const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase } = require('./config/database');

async function startServer() {
  // Initialize database first
  await initDatabase();
  console.log('✅ Database initialized');

  const app = express();
  const PORT = process.env.PORT || 5000;

  // Middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // API Routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/menu', require('./routes/menuRoutes'));
  app.use('/api/orders', require('./routes/orderRoutes'));
  app.use('/api/feedback', require('./routes/feedbackRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/staff', require('./routes/staffRoutes'));
  app.use('/api/payments', require('./routes/paymentRoutes'));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler
  const errorHandler = require('./middleware/errorHandler');
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`\n🚀 OrderGo API running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
