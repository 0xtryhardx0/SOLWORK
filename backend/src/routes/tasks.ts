import { Router } from 'express';
import { redisClient } from '../config/redis';

const router = Router();

// Mock tasks database
const mockTasks: Record<string, any[]> = {
  'audio-transcribe': [
    { id: 'audio_1', isHoneypot: true, instruction: 'Transcribe this clip.', correctAnswers: ['hello', 'hello world'] },
    { id: 'audio_2', isHoneypot: false, instruction: 'Transcribe this clip.', correctAnswers: ['testing'] }
  ],
  'bbox-bounding': [
    { id: 'bbox_1', isHoneypot: true, instruction: 'Box the vehicle.', correctCoordinates: { x: 10, y: 20 } }
  ]
};

// 1. Fetch campaigns (Active Datasets)
router.get('/campaigns', (req, res) => {
  res.status(200).json([
    { id: 'audio-transcribe', title: 'English Accents Speech Labeling', rate: 0.15 },
    { id: 'bbox-bounding', title: 'Autonomous Vehicle Obstacle Boxing', rate: 0.08 }
  ]);
});

// 2. Request next active task (Dynamic Push Feed)
router.post('/tasks/enter', async (req, res) => {
  const { campaignId, workerAddress } = req.body;
  if (!campaignId || !workerAddress) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const tasks = mockTasks[campaignId];
  if (!tasks || tasks.length === 0) {
    return res.status(404).json({ error: 'Campaign not found or empty' });
  }

  const taskIndex = Math.floor(Math.random() * tasks.length);
  const task = tasks[taskIndex];

  // Set Redis Lease Lock (90-second TTL)
  const leaseKey = `lease:${workerAddress}`;
  try {
    if (redisClient.isOpen) {
      await redisClient.set(leaseKey, task.id, { EX: 90 });
      console.log(`[LEASE] Set 90s lease for worker ${workerAddress} on task ${task.id}`);
    }
  } catch (err) {
    console.error('Redis lease write failed:', err);
  }

  res.status(200).json({
    id: task.id,
    instruction: task.instruction,
    isHoneypot: task.isHoneypot,
    leaseSeconds: 90
  });
});

// 3. Submit task response
router.post('/tasks/submit', async (req, res) => {
  const { workerAddress, taskId, campaignId, answer } = req.body;
  if (!workerAddress || !taskId || !campaignId || !answer) {
    return res.status(400).json({ error: 'Missing submission parameters' });
  }

  // Check Redis lease exists
  const leaseKey = `lease:${workerAddress}`;
  let leaseActive = true;
  try {
    if (redisClient.isOpen) {
      const activeLeaseTask = await redisClient.get(leaseKey);
      if (!activeLeaseTask || activeLeaseTask !== taskId) {
        leaseActive = false;
      } else {
        await redisClient.del(leaseKey);
      }
    }
  } catch (err) {
    console.error('Redis lease verification failed:', err);
  }

  if (!leaseActive) {
    return res.status(408).json({ error: 'Lease expired or invalid. Task was recycled.' });
  }

  const tasks = mockTasks[campaignId];
  const task = tasks ? tasks.find(t => t.id === taskId) : null;
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  let verified = true;
  if (task.isHoneypot) {
    if (task.correctAnswers) {
      verified = task.correctAnswers.some((ans: string) => answer.toLowerCase().includes(ans));
    }
  }

  res.status(200).json({
    verified,
    payoutAdded: verified ? 0.15 : 0.00,
    status: verified ? 'SUCCESS' : 'MISMATCH'
  });
});

export default router;
