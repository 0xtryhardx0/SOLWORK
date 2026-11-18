# SolWork Protocol — Colosseum Eternal Submission Pack & Sprint Roadmap

## 1. Project Profile & Metadata
* **Project Name**: SolWork Protocol
* **Tagline**: Decentralized AI microtasking & RLHF verification engine with instant fiat rails on Solana.
* **Track**: Infrastructure / AI / Consumer
* **Live App URL**: [https://solwork.vercel.app](https://solwork.vercel.app)
* **GitHub Repository**: [https://github.com/0xtryhardx0/SOLWORK](https://github.com/0xtryhardx0/SOLWORK)
* **Smart Contract (Devnet)**: `D6Ft7B9d32DbEaGegkMtBwHaUqJsdGiiDvayiyHhSZPy`
* **Target Audience**: AI labs needing low-latency RLHF human feedback + 100M+ emerging-market micro-earners.

---

## 2. Colosseum Submission Form Responses

### Short Description (max 300 characters)
> SolWork is an AI microtasking protocol that lets AI labs crowdsource human RLHF evaluation with automated AI oracle verification, trustless Solana escrow, and 1-click fiat off-ramping to local bank accounts (NGN/OPay/Kuda) without crypto friction.

### The Problem (Why does this matter?)
> Emerging market workers face 15–20% platform commissions on Upwork/Fiverr and payment bans on PayPal/Stripe. Simultaneously, AI foundation model companies spend billions on RLHF data annotation plagued by sybil attacks and fraudulent submissions. Existing Web3 microtask platforms force users to hold SOL for gas, install browser extensions, and manually bridge crypto to survive.

### The Solution (What makes SolWork 10x better?)
1. **Zero Crypto Friction ("Invisible Web3")**: Contributors log in with Google One-Tap. Wallets are derived under the hood. Gas is sponsored via Octane / Paymaster.
2. **Dual-Tier AI Oracle Verification**: Submissions are audited in real time against negative constraints and instruction rubrics before releasing escrowed funds, cryptographically signed with Ed25519.
3. **MultiHopper Instant Fiat Payout**: Contributors withdraw directly to Nigerian bank accounts (OPay, Moniepoint, Kuda, GTBank) in 8 seconds via automated liquidity routing.
4. **Sub-Cent Escrow on Solana**: Anchor programs lock employer bounties and disburse programmatic payouts at sub-cent transaction costs.

### Technical Architecture & Solana Integration
* **Anchor Smart Contracts**: Program escrow locking USDC/SOL bounties, released only upon host approval or AI Oracle Ed25519 signature verification (`instruction: verify_oracle_signature`).
* **MultiHopper Token-2022 Integration**: Routes funds between employer escrows, liquidity pools, and local off-ramp payment rails.
* **Serverless AI Evaluation Oracle**: Live endpoint analyzing submission adherence, synthetic LLM hallucination markers, and negative constraints.

---

## 3. The 4-Week Sprint Roadmap (What Judges Will Grade)

| Week | Phase | Deliverables & Sprint Milestones |
| :--- | :--- | :--- |
| **Week 1** | **MultiHopper & Routing** | Connect backend batch dispersal engine; integrate automated exchange rate oracle (USDC/NGN); wire live webhook to Paystack/Monnify for automated local bank transfers. |
| **Week 2** | **On-Chain AI Oracle** | Deploy Anchor Ed25519 signature verification program on Devnet. Prevent escrow payout without valid signed oracle receipt. |
| **Week 3** | **Mainnet Deployment** | Deploy SolWork Anchor program to Solana Mainnet-Beta; seed initial $500 community bounty pool for RLHF tasks. |
| **Week 4** | **Traction & Demo Video** | Onboard 250 Nigerian campus contributors (Unilag / LASU); execute 2,500 real microtasks; record 3-minute Colosseum walkthrough video and submit. |
