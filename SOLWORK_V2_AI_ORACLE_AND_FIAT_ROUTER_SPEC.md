# ⚡ SolWork Protocol v2: Autonomous AI Oracle & Universal Fiat Router Spec
**Architecture**: Open Two-Sided Marketplace, Multimodal AI Evaluation Oracle & Invisible Web3 Fiat Off-Ramping  
**Author**: Erioluwa Ayodeji  
**Network**: Solana Mainnet / Devnet (`D6Ft7B9d32DbEaGegkMtBwHaUqJsdGiiDvayiyHhSZPy`)  

---

## 🏛️ Executive Summary

SolWork v2 bridges the massive chasm between global AI/crypto capital and emerging market talent by solving the **two fatal flaws** of traditional gig platforms:
1. **Verification Latency & Fraud**: Replaces sluggish 14-day manual client reviews with an **Automated Multimodal AI Evaluation Oracle** that grades submissions in 3 seconds against the host’s exact rubric, while allowing hosts to spot-check or override.
2. **Web3 Usability Friction**: Replaces seed phrases, Phantom wallet barriers, and Binance P2P scams with **"Invisible Web3"** (Google sign-in) and **Direct NGN Bank Transfers** (OPay, Kuda, GTBank, Zenith) via the MultiHopper treasury router in under 30 seconds.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SOLWORK v2 ARCHITECTURE                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘

    [JOB HOST]                                                   [WORKER (STUDENT/DEV)]
        │                                                                   │
   1. Post Job + Rubric                                           1. Sign in with Google
   2. Fund Escrow (USDC)                                             (Invisible Solana PDA)
        │                                                                   │
        ▼                                                                   ▼
┌──────────────────┐                                               ┌──────────────────┐
│  Anchor Escrow   │                                               │ Complete Task &  │
│    PDA Vault     │                                               │ Submit Artifact  │
└────────┬─────────┘                                               └────────┬─────────┘
         │                                                                  │
         │                         2. Submits Work                          │
         │◄─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 🤖 SOLWORK AI EVALUATION ORACLE (Multimodal LLM-as-a-Judge)                         │
│ • Validates against host's positive criteria & negative constraints                 │
│ • Inspects plagiarism, synthetic AI hallucinations, format compliance              │
│ • Generates deterministic JSON Evaluation & Ed25519 Cryptographic Signature Proof   │
└────────────────────────────────────────┬────────────────────────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼ (Score ≥ 85%)                                 ▼ (Score < 85%)
      [Fast-Track Pre-Approval]                             [Flagged for Revision]
      • Host has 24h to spot-check                          • Exact line-by-line feedback
      • If host is idle, contract auto-releases!            • Worker can resubmit once
                 │
                 ▼
      [Anchor Contract Releases USDC]
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 🔀 MULTIHOPPER UNIVERSAL OFF-RAMP ROUTER                                            │
│ • Worker chooses payout destination:                                                │
│   [A] Native SPL USDC to Phantom Wallet (0% fee)                                    │
│   [B] Instant NGN Bank Transfer to Kuda / OPay / GTBank via Kotani Pay / Yellow Card│
└─────────────────────────────────────────────────────────────────────────────────────┘
                 │
                 ▼
      [Money Hits Nigerian Bank Account in 20 Seconds] ⚡🇳🇬
```

---

## 🤖 PART 1: The AI Evaluation Oracle Engine

### 1. The Core Innovation: "LLM-as-a-Judge" + Cryptographic Proof
Instead of a human reading 500 audio transcriptions or grading 200 code reviews, SolWork routes submissions through an **AI Evaluation Oracle Pipeline**.

### 2. The Deterministic Evaluation Schema
The AI Oracle evaluates the host's instructions, negative constraints, and worker submission against a rigid schema:

```json
{
  "taskId": "task_solwork_9841",
  "workerPubkey": "7xKq...9P2d",
  "rubricVersion": "v1.0",
  "scores": {
    "instructionAdherence": 95,
    "qualityAndAccuracy": 90,
    "negativeConstraintPass": true,
    "aiSyntheticContentScore": 12, 
    "compositeScore": 92.5
  },
  "complianceChecklist": [
    { "rule": "Audio transcribed verbatim without filler removal", "passed": true },
    { "rule": "No translation into English; keep native Yoruba/Pidgin", "passed": true },
    { "rule": "Correct timestamp bracket notation [00:14]", "passed": true }
  ],
  "decision": "APPROVED",
  "hostActionRequired": false,
  "confidenceScore": 0.96,
  "oracleSignature": "5nK...ed25519_proof"
}
```

### 3. The Production System Prompt for the AI Oracle
```python
SOLWORK_ORACLE_EVALUATOR_PROMPT = """
You are the SolWork Protocol Autonomous Task Arbiter. Your role is to impartially 
and strictly verify work submissions against the Job Host's exact specification.

JOB HOST RUBRIC:
{host_rubric_json}

NEGATIVE CONSTRAINTS (Strict grounds for rejection):
{negative_constraints}

WORKER SUBMISSION:
{worker_submission_payload}

EVALUATION PROTOCOL:
1. Instruction Adherence (0-100): Did the worker follow every formatting, structural, and stylistic requirement?
2. Negative Constraint Check: Did the worker violate ANY forbidden condition (e.g. using AI text generators when forbidden, incorrect aspect ratio, incorrect language dialect)? If any negative constraint fails, compositeScore cannot exceed 40.
3. Quality & Accuracy (0-100): Measure precision against reference ground truth or domain standard.

OUTPUT SPECIFICATION:
Return strictly valid JSON matching the SolWork Verification Schema.
Include concise, actionable reasoning for any deducted points.
"""
```

### 4. Consensus & Anti-Ghosting Rules
* **Score $\ge$ 85% (Approved)**:
  * The worker’s submission is verified. 
  * Host is notified: *"AI verified submission #412 with 93% match. You have 24 hours to review or override."*
  * **The Anti-Ghosting Guarantee**: If the host takes no action within 24 hours, the Anchor smart contract **automatically unlocks escrow and pays the worker**.
* **Score 60% – 84% (Review Required)**:
  * The AI flags exact discrepancies to the Host: *"Worker missed timestamps at line 14."*
  * Host can approve with 1 click or request a revision.
* **Score < 60% (Auto-Rejected)**:
  * Worker receives immediate feedback and can resubmit within 12 hours. Escrow remains safe.

---

## 💳 PART 2: Universal Fiat Router (Naira Bank Transfers for Web2 Users)

### 1. The Problem SolWork v2 Solves
95% of potential contributors in Nigeria (university students, teachers, STEM grads) will abandon a platform if they have to:
1. Buy SOL on an exchange.
2. Install Phantom and back up 12 words.
3. Learn how to bridge or use Binance P2P without getting scammed.

### 2. The Solution: "Invisible Web3" + MultiHopper Payouts

#### Step 1: Zero-Friction Web2 Onboarding
* User visits `solwork.vercel.app` and clicks **"Continue with Google"**.
* Behind the scenes, an **Embedded Solana Keypair (Turnkey / Web3Auth MPC)** is generated and tied to their authenticated email.
* The user never sees a seed phrase. Their wallet balance is displayed in their local currency preference: **"Balance: $12.50 (~₦20,500)"**.

#### Step 2: The MultiHopper $\rightarrow$ NGN Bank Pipeline
When the worker completes tasks and clicks **"Withdraw"**, they have two options:
* **Option A (Crypto Pro)**: Withdraw SPL USDC to any Solana address.
* **Option B (Direct Bank Transfer - 90% of Users)**:
  1. Worker enters: `Account Number`, `Select Bank (e.g. OPay / Kuda / GTBank / Zenith)`.
  2. MultiHopper Anchor contract executes a batch swap/transfer to an off-ramp liquidity vault.
  3. The backend triggers the **Kotani Pay / Yellow Card B2B Off-Ramp API**:
     * It burns/deposits the SPL USDC on Solana.
     * Initiates an instant local NIBSS / NIP credit transfer in Nigerian Naira.
     * The worker receives a bank credit SMS within 15–30 seconds.

```
[Worker Balance: 15 USDC]
           │
           ▼
[Click "Withdraw ₦24,500 to OPay"]
           │
           ▼
[MultiHopper Router verifies on-chain PDA balance]
           │
           ▼
[Kotani Pay / Yellow Card API Deposit Webhook]
           │
           ▼
[NIBSS Instant Transfer to 8012345678 (OPay)]
           │
           ▼
⚡ ₦24,500 Hits User's Phone in 20 Seconds!
```

---

## 📈 PART 3: The Unfair Advantage in Public Launch (X & Superteam)

### The Marketing Pitch that Goes Viral:
On Twitter/X and campus communities, nobody cares about technical Anchor PDA mechanics. 

**This is what you say:**
> *"Upwork takes 20% platform fees and makes Nigerians wait 7–14 days for bank clearances.*  
> 
> *We built **SolWork**:*  
> *1️⃣ Do micro-tasks (AI labeling, audio transcription, code review).*  
> *2️⃣ AI grades your work in 3 seconds.*  
> *3️⃣ Get paid in seconds directly to your OPay, Kuda, or bank account.*  
> 
> *Zero crypto knowledge needed. Real money, instant payouts. ⚡🇳🇬"*

### Why Investors & Grant Committees Back This:
* **Superteam Nigeria & Solana Foundation**: This fulfills Solana's primary thesis—using the Solana Virtual Machine (SVM) as an invisible, high-throughput financial clearinghouse for emerging market labor.
* **Alliance DAO ($400k check)**: SolWork v2 is the textbook definition of a **"Consumer Crypto Trojan Horse"** (Web2 frontend, crypto backend, high viral retention, organic fee revenue).

---

## 🛠️ PART 4: Immediate Implementation Roadmap

- [x] **Architecture Specification**: Complete in `SOLWORK_V2_AI_ORACLE_AND_FIAT_ROUTER_SPEC.md`.
- [ ] **Prototype the AI Judge Evaluator API**: Create `/api/evaluate_task.js` connecting to Gemini 1.5 Flash / GPT-4o with structured JSON schema output.
- [ ] **Integrate Web2 Google Auth Mockup**: Add Turnkey / Web3Auth Google Login modal to `solwork.vercel.app`.
- [ ] **Prototype MultiHopper Fiat Withdrawal UI**: Add Bank Account input modal (Bank, Account No, NGN conversion preview) to the worker dashboard.

