require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AuraBill MySQL Backend Server is running!',
    database: process.env.DB_NAME || 'aurabill_db',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ ok: false, error: err.message || 'Internal server error' });
});

// Connect to MySQL & Start Server
pool.getConnection()
  .then((conn) => {
    console.log('✅ Successfully connected to MySQL database:', process.env.DB_NAME || 'aurabill_db');
    conn.release();
    app.listen(PORT, () => {
      console.log(`🚀 AuraBill Express server running on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MySQL:', err.message);
    app.listen(PORT, () => {
      console.log(`🚀 AuraBill Express server running on port http://localhost:${PORT} (DB offline)`);
    });
  });
