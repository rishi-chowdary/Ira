const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const repaymentRoutes = require('./routes/repayments');
const userRoutes = require('./routes/users');
const verificationRoutes = require('./routes/verification');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/verification', verificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Interest slabs endpoint (public)
const { INTEREST_SLABS, calculateInterest } = require('./utils/interest');
app.get('/api/interest-slabs', (req, res) => {
  const slabs = INTEREST_SLABS.map(slab => ({
    ...slab,
    example: calculateInterest(1000, slab.maxDays),
  }));
  res.json({ slabs });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Ira P2P Lending Server running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/health`);
  console.log(`\n   Run 'npm run seed' to create demo data.\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use. Please stop the process using that port or set a different PORT environment variable.`);
    console.error(`   Example: PORT=5002 npm start`);
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});
