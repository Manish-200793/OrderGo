const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase } = require('./config/database');

async function startServer() {
  // Initialize database first
  await initDatabase();
  console.log('✅ Database initialized');

  const app = express();
  const PORT = process.env.PORT || 5000;

  // Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 150, // Limit each IP to 150 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again after a minute' }
  });
  app.use(globalLimiter);

  // Middleware
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.use(cors({ origin: [frontendUrl, 'http://localhost:5173'], credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Socket.io Setup
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: [frontendUrl, 'http://localhost:5173'],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });

  // Make io available to routes via req.app.get('io')
  app.set('io', io);

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Order Rate Limiter
  const orderLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // max 5 orders per minute
    message: { error: 'Too many orders placed, please wait a minute' }
  });

  // API Routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/menu', require('./routes/menuRoutes'));
  app.use('/api/orders', orderLimiter, require('./routes/orderRoutes'));
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

  server.listen(PORT, () => {
    console.log(`\n🚀 OrderGo API & WebSockets running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health\n`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
