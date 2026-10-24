import { Router } from 'express';
import { db } from '../config/db';

const router = Router();

// 1. Fetch worker balance from SQL database
router.get('/balance/:identifier', (req, res) => {
  const { identifier } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE wallet_address = ? OR email = ?').get(identifier, identifier) as any;
  
  if (!user) {
    return res.status(200).json({ identifier, withdrawable: 0.00, pending: 0.00 });
  }

  res.status(200).json({
    identifier,
    wallet_address: user.wallet_address,
    email: user.email,
    withdrawable: user.balance,
    tasks_completed: user.tasks_completed,
    accuracy: user.accuracy
  });
});

// 2. Request cash-out & log in SQL database
router.post('/cashout', (req, res) => {
  const { address, amount, option } = req.body;
  if (!address || !amount || !option) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const numAmount = parseFloat(amount);
  const user = db.prepare('SELECT * FROM users WHERE wallet_address = ? OR email = ?').get(address, address) as any;

  if (!user || user.balance < numAmount) {
    return res.status(400).json({ error: 'Insufficient balance in user account' });
  }

  // Deduct off-chain ledger balance in SQL
  const newBalance = parseFloat((user.balance - numAmount).toFixed(2));
  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, user.id);

  const now = new Date().toISOString();
  let txSig = null;
  let status = 'QUEUED';

  if (option === 'instant') {
    const fee = parseFloat((0.05 + (numAmount * 0.015)).toFixed(3));
    const netAmount = Math.max(0, parseFloat((numAmount - fee).toFixed(3)));
    txSig = `tx_solwork_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    status = 'PROCESSED';

    db.prepare(`
      INSERT INTO payouts (user_id, wallet_address, amount, option, tx_signature, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.wallet_address, netAmount, option, txSig, status, now);

    return res.status(200).json({
      status: 'PROCESSED',
      txSignature: txSig,
      netSent: netAmount,
      feeDeducted: fee,
      newBalance
    });
  } else if (option === 'multihopper') {
    const fee = parseFloat((numAmount * 0.005).toFixed(4)); // 0.5% MultiHopper Token-2022 fee
    const netAmount = Math.max(0, parseFloat((numAmount - fee).toFixed(4)));
    const routeId = `mhop_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    txSig = `5MHOP_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}Z`;
    status = 'MULTI_HOPPER_SETTLED';

    db.prepare(`
      INSERT INTO payouts (user_id, wallet_address, amount, option, tx_signature, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.wallet_address, netAmount, 'multihopper', txSig, status, now);

    return res.status(200).json({
      status: 'MULTI_HOPPER_SETTLED',
      routeId,
      txSignature: txSig,
      netSent: netAmount,
      feeDeducted: fee,
      partnerRevenueShare: (fee / 2),
      trmRiskScore: 0,
      token2022Program: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
      newBalance
    });
  } else {
    status = 'QUEUED';
    db.prepare(`
      INSERT INTO payouts (user_id, wallet_address, amount, option, tx_signature, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.wallet_address, numAmount, option, null, status, now);

    return res.status(200).json({
      status: 'QUEUED',
      batchTimeEstimated: '24 hours',
      newBalance
    });
  }
});

// 3. History of payouts
router.get('/history/:address', (req, res) => {
  const { address } = req.params;
  const history = db.prepare('SELECT * FROM payouts WHERE wallet_address = ? ORDER BY id DESC LIMIT 20').all(address);
  res.status(200).json({ history });
});

export default router;
