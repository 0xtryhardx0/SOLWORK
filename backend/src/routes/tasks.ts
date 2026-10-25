import { Router } from 'express';
import { redisClient } from '../config/redis';
import { db } from '../config/db';

const router = Router();

// 1. Fetch campaigns (Active Datasets)
router.get('/campaigns', (req, res) => {
  res.status(200).json([
    { id: 'audio-transcribe', title: 'English Accents Speech Labeling', rate: 0.15, icon: '🎙️' },
    { id: 'bbox-bounding', title: 'Autonomous Vehicle Obstacle Boxing', rate: 0.18, icon: '🚗' },
    { id: 'rlhf-calibration', title: 'RLHF LLM Alignment & Safety Rating', rate: 0.20, icon: '🧠' }
  ]);
});

// 2. Request next active task (Dynamic Push Feed from SQL)
router.post('/tasks/enter', async (req, res) => {
  const { campaignId, workerAddress } = req.body;
  if (!campaignId || !workerAddress) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const tasks = db.prepare('SELECT * FROM tasks WHERE campaign_id = ?').all(campaignId) as any[];
  if (!tasks || tasks.length === 0) {
    return res.status(404).json({ error: 'Campaign not found or empty in SQL database' });
  }

  const task = tasks[Math.floor(Math.random() * tasks.length)];

  // Set Redis Lease Lock (90-second TTL) if redis is connected
  const leaseKey = `lease:${workerAddress}`;
  try {
    if (redisClient.isOpen) {
      await redisClient.set(leaseKey, task.id, { EX: 90 });
    }
  } catch (err) {
    // Non-blocking fallback
  }

  res.status(200).json({
    id: task.id,
    instruction: task.instruction,
    isHoneypot: Boolean(task.is_honeypot),
    reward: task.reward,
    leaseSeconds: 90
  });
});

// 3. Submit task response & record in SQL database
router.post('/tasks/submit', async (req, res) => {
  const { workerAddress, taskId, campaignId, answer } = req.body;
  if (!workerAddress || !taskId || !campaignId || !answer) {
    return res.status(400).json({ error: 'Missing submission parameters' });
  }

  // Clear Redis lease if active
  const leaseKey = `lease:${workerAddress}`;
  try {
    if (redisClient.isOpen) {
      await redisClient.del(leaseKey);
    }
  } catch (err) {
    // Non-blocking
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) {
    return res.status(404).json({ error: 'Task not found in SQL database' });
  }

  let verified = true;
  if (task.is_honeypot && task.correct_answers) {
    try {
      const correctList: string[] = JSON.parse(task.correct_answers);
      if (correctList.length > 0) {
        verified = correctList.some((ans: string) => 
          answer.toLowerCase().includes(ans.toLowerCase())
        );
      }
    } catch {
      verified = true;
    }
  }

  const payoutEarned = verified ? task.reward : 0.00;
  const now = new Date().toISOString();

  // Find user in SQL
  let user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(workerAddress) as any;
  let userId = user ? user.id : null;

  if (!user) {
    // Auto-create user if submitting from new wallet
    const insertUser = db.prepare(`
      INSERT INTO users (email, wallet_address, role, balance, accuracy, tasks_completed, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const dummyEmail = `user_${workerAddress.slice(0, 6)}@solwork.fun`;
    const resInsert = insertUser.run(dummyEmail, workerAddress, 'worker', payoutEarned, verified ? 100.0 : 0.0, 1, now, now);
    userId = resInsert.lastInsertRowid;
  } else {
    // Update existing user statistics and balance in SQL
    const newTasksCount = user.tasks_completed + 1;
    const newBalance = parseFloat((user.balance + payoutEarned).toFixed(2));
    
    // Calculate new accuracy
    const allSubmissions = db.prepare('SELECT COUNT(*) as total, SUM(verified) as passed FROM submissions WHERE wallet_address = ?').get(workerAddress) as any;
    const totalCount = (allSubmissions?.total || 0) + 1;
    const passedCount = (allSubmissions?.passed || 0) + (verified ? 1 : 0);
    const newAccuracy = parseFloat(((passedCount / totalCount) * 100).toFixed(1));

    db.prepare(`
      UPDATE users 
      SET balance = ?, tasks_completed = ?, accuracy = ?, last_login = ?
      WHERE id = ?
    `).run(newBalance, newTasksCount, newAccuracy, now, user.id);
  }

  // Insert submission into SQL
  db.prepare(`
    INSERT INTO submissions (user_id, wallet_address, task_id, campaign_id, answer, verified, payout_earned, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, workerAddress, taskId, campaignId, String(answer), verified ? 1 : 0, payoutEarned, now);

  // Return fresh user profile
  const updatedUser = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(workerAddress);

  res.status(200).json({
    verified,
    payoutAdded: payoutEarned,
    status: verified ? 'SUCCESS' : 'MISMATCH',
    user: updatedUser
  });
});

// 4. Enterprise / Research Pilot: Batch Upload Tasks
router.post('/pilot/batch', (req, res) => {
  const { campaignId, campaignTitle, tasks } = req.body;
  if (!campaignId || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: 'campaignId and an array of tasks are required' });
  }

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO tasks (id, campaign_id, instruction, is_honeypot, correct_answers, reward)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const t of tasks) {
    const taskId = t.id || `${campaignId}_${Date.now()}_${inserted + 1}`;
    const instruction = t.instruction || 'Review and annotate according to guidelines.';
    const isHoneypot = t.isHoneypot ? 1 : 0;
    const correctAnswers = JSON.stringify(t.correctAnswers || []);
    const reward = typeof t.reward === 'number' ? t.reward : 0.20;

    insertStmt.run(taskId, campaignId, instruction, isHoneypot, correctAnswers, reward);
    inserted++;
  }

  res.status(200).json({
    status: 'SUCCESS',
    campaignId,
    campaignTitle: campaignTitle || campaignId,
    tasksIngested: inserted,
    timestamp: new Date().toISOString()
  });
});

// 5. Enterprise / Research Pilot: Export Completed Dataset (JSON or CSV)
router.get('/campaigns/:campaignId/export', (req, res) => {
  const { campaignId } = req.params;
  const format = (req.query.format as string) || 'json';

  const submissions = db.prepare(`
    SELECT id, wallet_address, task_id, campaign_id, answer, verified, payout_earned, submitted_at
    FROM submissions
    WHERE campaign_id = ?
    ORDER BY submitted_at DESC
  `).all(campaignId) as any[];

  if (format.toLowerCase() === 'csv') {
    const headers = ['Submission ID', 'Worker Wallet', 'Task ID', 'Campaign ID', 'Answer', 'Verified', 'Payout (USDC)', 'Submitted At'];
    const rows = submissions.map(s => [
      s.id,
      `"${s.wallet_address}"`,
      `"${s.task_id}"`,
      `"${s.campaign_id}"`,
      `"${(s.answer || '').replace(/"/g, '""')}"`,
      s.verified ? 'YES' : 'NO',
      s.payout_earned.toFixed(2),
      `"${s.submitted_at}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="solwork_dataset_${campaignId}_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  }

  res.status(200).json({
    campaignId,
    totalRecords: submissions.length,
    exportedAt: new Date().toISOString(),
    dataset: submissions
  });
});

// 6. Real-Time Pilot Telemetry & Audit Feed
router.get('/pilot/telemetry', (req, res) => {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any)?.count || 0;
  const taskCount = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any)?.count || 0;
  const submissionStats = db.prepare(`
    SELECT COUNT(*) as total, SUM(payout_earned) as totalPayout, AVG(verified) * 100 as avgAccuracy
    FROM submissions
  `).get() as any;

  const campaignBreakdown = db.prepare(`
    SELECT campaign_id, COUNT(*) as submission_count, SUM(payout_earned) as total_usdc
    FROM submissions
    GROUP BY campaign_id
  `).all() as any[];

  res.status(200).json({
    protocol: 'SolWork AI Microtasking Protocol',
    status: 'ONLINE',
    network: 'Solana Devnet / Mainnet-Ready',
    telemetry: {
      registeredContributors: userCount,
      activeTasksInPool: taskCount,
      totalCompletedSubmissions: submissionStats?.total || 0,
      totalUsdcSettled: parseFloat((submissionStats?.totalPayout || 0).toFixed(2)),
      benchmarkAccuracy: parseFloat((submissionStats?.avgAccuracy || 100.0).toFixed(1)),
      campaigns: campaignBreakdown
    },
    generatedAt: new Date().toISOString()
  });
});

export default router;
