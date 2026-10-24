// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../solwork.db');

export const db = new DatabaseSync(DB_PATH);

// Initialize Tables and seed data
export const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      wallet_address TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'worker',
      balance REAL DEFAULT 0.00,
      accuracy REAL DEFAULT 100.0,
      tasks_completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_login TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      instruction TEXT NOT NULL,
      is_honeypot INTEGER DEFAULT 0,
      correct_answers TEXT,
      reward REAL DEFAULT 0.15
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      wallet_address TEXT NOT NULL,
      task_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      verified INTEGER DEFAULT 1,
      payout_earned REAL DEFAULT 0.00,
      submitted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      wallet_address TEXT NOT NULL,
      amount REAL NOT NULL,
      option TEXT NOT NULL,
      tx_signature TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default tasks if empty
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
  if (taskCount.count === 0) {
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, campaign_id, instruction, is_honeypot, correct_answers, reward)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertTask.run('audio_1', 'audio-transcribe', 'Transcribe the audio clip with clean punctuation.', 1, JSON.stringify(['hello world', 'hello']), 0.15);
    insertTask.run('audio_2', 'audio-transcribe', 'Verify if speaker accent sounds native or regional.', 0, JSON.stringify(['native', 'us']), 0.12);
    insertTask.run('bbox_1', 'bbox-bounding', 'Box the primary vehicle in the scene [xmin, ymin, xmax, ymax].', 1, JSON.stringify(['[10, 20, 150, 200]']), 0.18);
    insertTask.run('bbox_2', 'bbox-bounding', 'Label pedestrian bounding zone.', 0, JSON.stringify([]), 0.14);
    insertTask.run('rlhf_1', 'rlhf-calibration', 'Score model response for helpfulness and safety (1-5).', 0, JSON.stringify([]), 0.20);
  }

  // Seed initial demo worker if empty
  const demoWorker = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get('7Q9NYXodMBXjcAYRhDbxFgDStYRMJBrRCrkVn8iNPsVh');
  if (!demoWorker) {
    const insertUser = db.prepare(`
      INSERT INTO users (email, wallet_address, role, balance, accuracy, tasks_completed, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(
      'demo@solwork.fun',
      '7Q9NYXodMBXjcAYRhDbxFgDStYRMJBrRCrkVn8iNPsVh',
      'worker',
      15.50,
      99.2,
      48,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  console.log(`[DATABASE] SQLite initialized at: ${DB_PATH}`);
};
