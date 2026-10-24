import { Router } from 'express';
import { db } from '../config/db';
import crypto from 'crypto';
import { Keypair } from '@solana/web3.js';

const router = Router();

// Helper: Derive a deterministic Solana Keypair/Address from email + seed
function deriveWalletFromEmail(email: string): string {
  const hash = crypto.createHash('sha256').update(`solwork_salt_${email.toLowerCase().trim()}`).digest();
  const seed = hash.subarray(0, 32);
  const keypair = Keypair.fromSeed(seed);
  return keypair.publicKey.toBase58();
}

// 1. Email Login or Register
router.post('/email-login', (req, res) => {
  const { email, role = 'worker' } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();

  // Check if user exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;

  if (existingUser) {
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now, existingUser.id);
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(existingUser.id) as any;
    return res.status(200).json({
      message: 'Logged in successfully',
      isNewUser: false,
      user: updatedUser
    });
  }

  // Create new user with embedded Solana wallet derived from email
  const embeddedWallet = deriveWalletFromEmail(cleanEmail);
  const insertStmt = db.prepare(`
    INSERT INTO users (email, wallet_address, role, balance, accuracy, tasks_completed, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(cleanEmail, embeddedWallet, role, 0.00, 100.0, 0, now, now);
  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;

  return res.status(201).json({
    message: 'User registered with embedded Solana wallet',
    isNewUser: true,
    user: newUser
  });
});

// 2. Phantom Wallet Login or Register
router.post('/wallet-login', (req, res) => {
  const { walletAddress, role = 'worker' } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  const now = new Date().toISOString();
  const existingUser = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(walletAddress) as any;

  if (existingUser) {
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now, existingUser.id);
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(existingUser.id) as any;
    return res.status(200).json({
      message: 'Wallet session authenticated',
      user: updatedUser
    });
  }

  const insertStmt = db.prepare(`
    INSERT INTO users (email, wallet_address, role, balance, accuracy, tasks_completed, created_at, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const dummyEmail = `wallet_${walletAddress.slice(0, 6)}@solwork.fun`;
  const result = insertStmt.run(dummyEmail, walletAddress, role, 0.00, 100.0, 0, now, now);
  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;

  return res.status(201).json({
    message: 'New wallet registered',
    user: newUser
  });
});

// 3. Get User Profile by Email or Wallet Address
router.get('/user/:identifier', (req, res) => {
  const { identifier } = req.params;
  const user = db.prepare(`
    SELECT * FROM users WHERE email = ? OR wallet_address = ?
  `).get(identifier, identifier) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found in SQL database' });
  }

  // Get user's recent submissions
  const submissions = db.prepare(`
    SELECT * FROM submissions WHERE wallet_address = ? ORDER BY id DESC LIMIT 10
  `).all(user.wallet_address);

  return res.status(200).json({
    user,
    submissions
  });
});

// 4. List all users (Backend Website & Admin Overview)
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY id DESC').all();
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as totalUsers,
      SUM(balance) as totalBalance,
      SUM(tasks_completed) as totalTasksCompleted,
      AVG(accuracy) as avgAccuracy
    FROM users
  `).get();

  return res.status(200).json({
    stats,
    users
  });
});

export default router;
