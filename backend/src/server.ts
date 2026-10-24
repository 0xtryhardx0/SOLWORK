import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis';
import { initDatabase } from './config/db';
import tasksRouter from './routes/tasks';
import payoutsRouter from './routes/payouts';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount API Routes
app.use('/api', tasksRouter);
app.use('/api/payouts', payoutsRouter);
app.use('/api/auth', authRouter);

// Global Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SolWork Backend Core with SQLite Persistence'
  });
});

const startServer = async () => {
  // Initialize SQLite Database
  initDatabase();

  // Connect to Redis active queue
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 SolWork Backend listening at http://localhost:${PORT}`);
    console.log(`💾 SQLite Persistent User & Payout Ledger Active`);
    console.log(`==================================================`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
