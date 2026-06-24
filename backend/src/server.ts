import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Global Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SolWork Backend Core'
  });
});

const startServer = async () => {
  // Connect to Redis active queue
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 SolWork Backend listening at http://localhost:${PORT}`);
    console.log(`==================================================`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
