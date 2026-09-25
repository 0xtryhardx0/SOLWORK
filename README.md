# ⚡ SolWork: Decentralized AI Microtasking & Escrow Protocol on Solana

> **Non-custodial milestone escrows and micro-payouts for African developers and AI dataset contributors, settling in SPL USDC via Anchor smart contracts.**

[![Solana](https://img.shields.io/badge/Network-Solana%20Devnet%20%26%20Mainnet-14F195?style=for-the-badge&logo=solana)](https://solana.com)
[![Framework](https://img.shields.io/badge/Framework-Anchor%200.29-9945FF?style=for-the-badge)](https://anchor-lang.com)
[![Token](https://img.shields.io/badge/Settlement-SPL%20USDC-2775CA?style=for-the-badge)](https://solana.com)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)

---

## 🌟 The Vision

African freelancers and digital workers face persistent friction in the global digital economy:
1. **Domestic Banking Delays & Freezes**: Wire transfers from global platforms take 3 to 7 business days, and domestic payment processors frequently freeze accounts or apply arbitrary foreign exchange margins.
2. **High Remittance Fees**: Cross-border platforms extract 15% to 25% in platform take-rates, currency conversion, and withdrawal fees.
3. **Escrow Insecurity**: Traditional platforms side with corporate clients during disputes, leaving gig workers unpaid for delivered work.

**SolWork** replaces centralized middlemen with **auditable, non-custodial Anchor smart contracts** on Solana:
* **Sub-Cent Escrow Settlement**: Clients fund campaigns into a Program Derived Address (PDA) vault. As tasks or milestones are completed, smart contracts release USDC payouts directly to worker wallets in **400ms**.
* **AI Training Microtasking Engine**: Workers label computer vision datasets, transcribe audio, or audit LLM prompts, unlocking instant on-chain payouts.
* **Accuracy-Weighted Qualification**: Built-in qualification benchmarks (Bronze, Silver, Gold tiers) ensure quality deliverables while guaranteeing instant payout upon validation.

---

## 🛠️ Architecture & On-Chain State Machine

```
solwork_prototype/
├── backend/
│   ├── program/
│   │   ├── Cargo.toml            # Anchor Rust program manifest
│   │   └── src/
│   │       └── lib.rs            # Anchor Smart Contract (PDA Escrow Vaults & Token Transfers)
│   ├── src/
│   │   ├── index.ts              # Express API & Solana Web3.js transaction orchestrator
│   │   └── routes/               # Task dispatching and verification endpoints
│   └── tsconfig.json
└── frontend/
    ├── index.html                # Responsive AI tasking dashboard
    ├── app.js                    # Web3 wallet connection, task renderer, balance tracker
    ├── style.css                 # Cyber-minimalist dark theme
    └── server.py                 # Local preview server
```

---

## 📜 On-Chain Anchor Instructions

The Solana Anchor program ([`backend/program/src/lib.rs`](backend/program/src/lib.rs)) defines 4 core instructions:

| Instruction | Accounts Involved | Purpose |
| :--- | :--- | :--- |
| **`initialize_campaign`** | `creator`, `campaign`, `vault`, `creator_token_account`, `token_program` | Initializes campaign PDA and transfers escrowed SPL USDC into the PDA vault. |
| **`release_payout`** | `authority`, `campaign`, `vault`, `worker_token_account`, `token_program` | Verifies milestone/task completion and uses PDA seed signing (`CpiContext`) to release funds to the worker. |
| **`refund_campaign`** | `creator`, `campaign`, `vault`, `creator_token_account`, `token_program` | Allows campaign creator to reclaim unspent escrow funds once campaign duration lapses. |
| **`close_campaign`** | `creator`, `campaign`, `vault`, `token_program` | Closes campaign PDA and reclaims lamport rent. |

### Anchor Program ID
```rust
declare_id!("84AVToEkDwsMXNh77n156DYHaWJa2zVqi8han3qqVdAk");
```

---

## 🚀 Quick Start

### 1. Build Anchor Smart Contract
```bash
cd backend/program
anchor build
```

### 2. Start Backend API
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend Dashboard
```bash
cd frontend
python3 server.py
```
Open **`http://localhost:8080`** in your browser.

---

## 📄 License
MIT License © 2026 Erioluwa Ayodeji & SolWork Contributors.
