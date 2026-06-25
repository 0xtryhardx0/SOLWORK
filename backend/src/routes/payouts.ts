import { Router } from 'express';

const router = Router();

// Mock worker virtual balances
const mockBalances: Record<string, number> = {
  '7Q9NYXodMBXjcAYRhDbxFgDStYRMJBrRCrkVn8iNPsVh': 12.50
};

// 1. Fetch worker balances
router.get('/balance/:address', (req, res) => {
  const { address } = req.params;
  const balance = mockBalances[address] || 0.00;
  res.status(200).json({ address, withdrawable: balance, pending: 0.00 });
});

// 2. Request cash-out
router.post('/cashout', (req, res) => {
  const { address, amount, option } = req.body;
  if (!address || !amount || !option) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const userBalance = mockBalances[address] || 0.00;
  if (userBalance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Deduct off-chain ledger balance
  mockBalances[address] = userBalance - amount;

  if (option === 'instant') {
    const fee = 0.05 + (amount * 0.015);
    const netAmount = Math.max(0, amount - fee);
    console.log(`[CASHOUT] Instant transfer to ${address} for net: ${netAmount} USDC (fee: ${fee})`);
    
    return res.status(200).json({
      status: 'PROCESSED',
      txSignature: '3MocK54Signature84729471947219471928472',
      netSent: netAmount,
      feeDeducted: fee
    });
  } else {
    console.log(`[CASHOUT] Batched payout queued for ${address} for amount: ${amount} USDC`);
    return res.status(200).json({
      status: 'QUEUED',
      batchTimeEstimated: '24 hours'
    });
  }
});

export default router;
