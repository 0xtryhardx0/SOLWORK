// SolWork Client Application Logic

// 1. STATE MANAGEMENT
let state = {
  walletConnected: false,
  walletAddress: null,
  withdrawableBalance: 0.00, // Starts at 0, unlocked after qualification
  pendingBalance: 0.00,      // Earned during qualification or active work
  accuracy: 100.0,
  totalTasksCompleted: 0,
  honeypotsPassed: 0,
  honeypotsTotal: 0,
  currentTier: 'bronze', // bronze, silver, gold, super
  qualificationTasksCompleted: 0,
  isQualified: false,
  
  // Active Workspace State
  activeCampaign: null,
  activeTaskIndex: 0,
  activeTask: null,
  leaseTimer: null,
  secondsRemaining: 90,
  
  // Cashout Modal State
  selectedPayoutOption: 'free', // 'free' or 'instant'
  withdrawalAmount: 0.00
};

// 2. MOCK DATA
const campaigns = [
  {
    id: 'audio-transcribe',
    title: 'English Accents Speech Labeling',
    client: 'AetherVoice AI',
    totalPool: 2500.00,
    remainingPool: 2250.00,
    rate: 0.15,
    requiredTier: 'bronze',
    type: 'audio',
    tasks: [
      {
        instruction: 'Listen to the audio clip and transcribe the text exactly as spoken. Ignore background clicks.',
        audioUrl: 'mock-speech-1.wav',
        transcriptHint: 'The quick brown fox jumps over the lazy dog',
        isHoneypot: true,
        correctAnswers: ['the quick brown fox jumps over the lazy dog', 'quick brown fox jumps over the lazy dog']
      },
      {
        instruction: 'Transcribe the spoken digits in this clip. Format as numbers (e.g. 524).',
        audioUrl: 'mock-digits.wav',
        transcriptHint: 'Eight seven zero two',
        isHoneypot: false,
        correctAnswers: ['8702', 'eight seven zero two']
      },
      {
        instruction: 'Listen to the regional dialect and transcribe the full sentence.',
        audioUrl: 'mock-dialect.wav',
        transcriptHint: 'Welcome to the digital workspace of Solana',
        isHoneypot: true,
        correctAnswers: ['welcome to the digital workspace of solana', 'welcome to the digital workspace']
      }
    ]
  },
  {
    id: 'bbox-bounding',
    title: 'Autonomous Vehicle Obstacle Boxing',
    client: 'WayDrive Robotics',
    totalPool: 5000.00,
    remainingPool: 4120.00,
    rate: 0.08,
    requiredTier: 'silver',
    type: 'bbox',
    tasks: [
      {
        instruction: 'Draw a bounding box around the pedestrian crossing the street in the center view.',
        imageBg: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=480', // Bus/Street
        isHoneypot: true,
        correctCoordinates: { x: 100, y: 80, w: 120, h: 200 }
      },
      {
        instruction: 'Draw a bounding box around the red traffic light at the intersection.',
        imageBg: 'https://images.unsplash.com/photo-1509059880000-f1d01b448b2d?auto=format&fit=crop&q=80&w=480',
        isHoneypot: false,
        correctCoordinates: { x: 220, y: 30, w: 40, h: 80 }
      }
    ]
  },
  {
    id: 'rlhf-coding',
    title: 'Coding LLM Assistant Response Rating',
    client: 'DeepLogic Research',
    totalPool: 12000.00,
    remainingPool: 11350.00,
    rate: 0.65,
    requiredTier: 'gold',
    type: 'rlhf',
    tasks: [
      {
        instruction: 'Analyze the prompt and choose which Python coding assistant response is safer, more concise, and free of bugs.',
        prompt: 'Write a Python function to read a local file securely without path traversal issues.',
        responseA: 'def read_secure(filename):\n    # Simply open the file\n    with open(f"/data/{filename}", "r") as f:\n        return f.read()',
        responseB: 'import os\ndef read_secure(filename, base_dir="/data"):\n    safe_path = os.path.abspath(os.path.join(base_dir, filename))\n    if not safe_path.startswith(os.path.abspath(base_dir)):\n        raise ValueError("Directory traversal detected!")\n    with open(safe_path, "r") as f:\n        return f.read()',
        correctChoice: 'B',
        isHoneypot: true
      },
      {
        instruction: 'Select the response that correctly explains binary search time complexity in Markdown.',
        prompt: 'Explain binary search complexity.',
        responseA: 'Binary search runs in O(N) linear time because it inspects elements sequentially in a sorted list.',
        responseB: 'Binary search runs in O(log N) logarithmic time because it divides the search space in half with each iteration.',
        correctChoice: 'B',
        isHoneypot: false
      }
    ]
  }
];

// 3. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  renderCampaigns();
  updateUI();
});

// Render Campaigns dynamically
function renderCampaigns() {
  const container = document.getElementById('campaigns-grid');
  container.innerHTML = '';
  
  campaigns.forEach(c => {
    const isLocked = getTierRank(state.currentTier) < getTierRank(c.requiredTier);
    const progressPercent = (c.remainingPool / c.totalPool) * 100;
    
    const card = document.createElement('div');
    card.className = `campaign-card ${isLocked ? 'locked' : ''}`;
    if (!isLocked) {
      card.onclick = () => enterCampaign(c.id);
    }
    
    card.innerHTML = `
      <span class="campaign-badge">${c.requiredTier} tier</span>
      <h3 class="campaign-title">${c.title}</h3>
      <div class="campaign-client">${c.client}</div>
      
      <div class="progress-container">
        <div class="progress-header">
          <span>Escrow Pool Remaining</span>
          <span>${progressPercent.toFixed(0)}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      
      <div class="campaign-metrics">
        <div class="metric-col">
          <span class="metric-label">Escrow Pool</span>
          <span class="metric-val">$${c.remainingPool.toLocaleString()} USDC</span>
        </div>
        <div class="metric-col" style="text-align: right;">
          <span class="metric-label">Pay Per Task</span>
          <span class="metric-val pay-val">$${c.rate.toFixed(2)} USDC</span>
        </div>
      </div>
      ${isLocked ? `<div style="color: var(--error); font-size: 0.8rem; font-weight: 600; text-align: center; margin-top: 8px;">🔒 Locked: Requires ${c.requiredTier.toUpperCase()} Tier</div>` : ''}
    `;
    container.appendChild(card);
  });
}

function getTierRank(tier) {
  const ranks = { bronze: 1, silver: 2, gold: 3, super: 4 };
  return ranks[tier] || 1;
}

// 4. WALLET MANAGEMENT
function toggleWallet() {
  if (state.walletConnected) {
    // Disconnect
    state.walletConnected = false;
    state.walletAddress = null;
    document.getElementById('wallet-text').innerText = 'Connect Wallet';
    document.getElementById('connect-wallet-btn').classList.remove('wallet-connected');
  } else {
    // Connect
    state.walletConnected = true;
    state.walletAddress = '7Q9N...Vh';
    document.getElementById('wallet-text').innerText = state.walletAddress;
    document.getElementById('connect-wallet-btn').classList.add('wallet-connected');
  }
  updateUI();
}

// 5. UPDATE SYSTEM UI
function updateUI() {
  document.getElementById('withdrawable-balance').innerText = `${state.withdrawableBalance.toFixed(2)} USDC`;
  document.getElementById('pending-balance').innerText = `${state.pendingBalance.toFixed(2)} USDC`;
  document.getElementById('accuracy-value').innerText = `${state.accuracy.toFixed(1)}%`;
  document.getElementById('completed-tasks-count').innerText = state.totalTasksCompleted;
  
  // Update badge and colors
  const badge = document.getElementById('tier-badge');
  badge.className = `tier-badge tier-${state.currentTier}`;
  badge.innerText = state.currentTier;
  
  // Enable/Disable cashout button
  const cashoutBtn = document.getElementById('cashout-trigger-btn');
  if (state.walletConnected && state.withdrawableBalance > 0) {
    cashoutBtn.disabled = false;
  } else {
    cashoutBtn.disabled = true;
  }
  
  // Qualification Banner logic
  const banner = document.getElementById('qualification-banner');
  const fraction = document.getElementById('qual-fraction');
  const fill = document.getElementById('qual-progress-fill');
  
  if (state.isQualified) {
    banner.style.display = 'none';
  } else {
    banner.style.display = 'flex';
    fraction.innerText = `${state.qualificationTasksCompleted}/10 tasks`;
    fill.style.width = `${(state.qualificationTasksCompleted / 10) * 100}%`;
  }
}

// 6. WORKSPACE INTERACTION (THE PUSH FEED)
function enterCampaign(campaignId) {
  if (!state.walletConnected) {
    alert('Please connect your Solana wallet first.');
    return;
  }
  
  const c = campaigns.find(item => item.id === campaignId);
  state.activeCampaign = c;
  state.activeTaskIndex = 0;
  
  document.getElementById('workspace-project-title').innerText = c.title;
  document.getElementById('workspace-project-escrow').innerText = `Escrow: $${c.remainingPool.toLocaleString()} USDC`;
  
  // Show Workspace
  document.getElementById('workspace-overlay').classList.remove('hidden');
  
  loadTask();
}

function closeWorkspace() {
  document.getElementById('workspace-overlay').classList.add('hidden');
  clearInterval(state.leaseTimer);
  state.activeCampaign = null;
  state.activeTask = null;
  renderCampaigns();
  updateUI();
}

// Load current task into Workspace
function loadTask() {
  const c = state.activeCampaign;
  if (!c) return;
  
  // If we cycled through all campaign tasks, loop back or generate mock ones
  if (state.activeTaskIndex >= c.tasks.length) {
    state.activeTaskIndex = 0;
  }
  
  state.activeTask = c.tasks[state.activeTaskIndex];
  const task = state.activeTask;
  
  const card = document.getElementById('active-task-card');
  card.innerHTML = '';
  
  // Construct Instructions
  const inst = document.createElement('div');
  inst.className = 'task-instructions';
  inst.innerText = task.instruction;
  card.appendChild(inst);
  
  // Inject specific task components
  if (c.type === 'audio') {
    renderAudioTask(card, task);
  } else if (c.type === 'bbox') {
    renderBboxTask(card, task);
  } else if (c.type === 'rlhf') {
    renderRlhfTask(card, task);
  }
  
  // Start 90-second countdown
  startLeaseTimer();
}

// Start active lease timer
function startLeaseTimer() {
  clearInterval(state.leaseTimer);
  state.secondsRemaining = 90;
  const timerFill = document.getElementById('timer-fill');
  timerFill.className = 'timer-fill';
  timerFill.style.width = '100%';
  
  state.leaseTimer = setInterval(() => {
    state.secondsRemaining--;
    const pct = (state.secondsRemaining / 90) * 100;
    timerFill.style.width = `${pct}%`;
    
    // Timer Warning classes
    if (state.secondsRemaining <= 30 && state.secondsRemaining > 15) {
      timerFill.classList.add('warning');
    } else if (state.secondsRemaining <= 15) {
      timerFill.classList.remove('warning');
      timerFill.classList.add('critical');
    }
    
    if (state.secondsRemaining <= 0) {
      clearInterval(state.leaseTimer);
      handleLeaseExpiry();
    }
  }, 1000);
}

function handleLeaseExpiry() {
  alert('Task lease expired! The task has been recycled back to the global pool.');
  skipTask();
}

// Render Audio Task
let isAudioPlaying = false;
let audioTimer = null;
function renderAudioTask(card, task) {
  const wrapper = document.createElement('div');
  wrapper.className = 'audio-player-wrapper';
  
  const btn = document.createElement('button');
  btn.className = 'play-audio-btn';
  btn.id = 'play-audio-trigger';
  btn.innerHTML = '▶';
  btn.onclick = () => toggleAudioPlayback();
  
  const waveContainer = document.createElement('div');
  waveContainer.className = 'audio-wave-anim';
  waveContainer.id = 'audio-wave-container';
  for (let i = 0; i < 8; i++) {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    waveContainer.appendChild(bar);
  }
  
  wrapper.appendChild(btn);
  wrapper.appendChild(waveContainer);
  card.appendChild(wrapper);
  
  const input = document.createElement('textarea');
  input.className = 'transcription-input';
  input.placeholder = 'Type the transcription here... (e.g. The quick brown fox)';
  input.id = 'task-answer-input';
  card.appendChild(input);
}

function toggleAudioPlayback() {
  const btn = document.getElementById('play-audio-trigger');
  const wave = document.getElementById('audio-wave-container');
  isAudioPlaying = !isAudioPlaying;
  
  if (isAudioPlaying) {
    btn.innerHTML = '⏸';
    wave.classList.add('playing');
    // Simulate audio end after 4 seconds
    audioTimer = setTimeout(() => {
      isAudioPlaying = false;
      btn.innerHTML = '▶';
      wave.classList.remove('playing');
    }, 4000);
  } else {
    btn.innerHTML = '▶';
    wave.classList.remove('playing');
    clearTimeout(audioTimer);
  }
}

// Render Bounding Box Task
let startBboxX = 0, startBboxY = 0;
let isDrawingBbox = false;
function renderBboxTask(card, task) {
  const wrapper = document.createElement('div');
  wrapper.className = 'canvas-wrapper';
  wrapper.style.backgroundImage = `url('${task.imageBg}')`;
  wrapper.id = 'bbox-canvas';
  
  const guide = document.createElement('span');
  guide.className = 'bbox-guide';
  guide.innerText = 'Drag to draw Bounding Box';
  wrapper.appendChild(guide);
  
  const box = document.createElement('div');
  box.className = 'bounding-box-overlay';
  box.id = 'bounding-box-shape';
  wrapper.appendChild(box);
  
  card.appendChild(wrapper);
  
  // Attach Canvas Mouse Listeners (Desktop & Mobile Touch Simulation)
  wrapper.onmousedown = (e) => startDrawingBbox(e, wrapper, box);
  wrapper.onmousemove = (e) => drawBbox(e, wrapper, box);
  wrapper.onmouseup = () => stopDrawingBbox();
  
  wrapper.ontouchstart = (e) => {
    const touch = e.touches[0];
    startDrawingBbox(touch, wrapper, box);
  };
  wrapper.ontouchmove = (e) => {
    const touch = e.touches[0];
    drawBbox(touch, wrapper, box);
  };
  wrapper.ontouchend = () => stopDrawingBbox();
}

function startDrawingBbox(e, canvas, box) {
  const rect = canvas.getBoundingClientRect();
  startBboxX = e.clientX - rect.left;
  startBboxY = e.clientY - rect.top;
  isDrawingBbox = true;
  
  box.style.left = `${startBboxX}px`;
  box.style.top = `${startBboxY}px`;
  box.style.width = '0px';
  box.style.height = '0px';
  box.style.display = 'block';
}

function drawBbox(e, canvas, box) {
  if (!isDrawingBbox) return;
  const rect = canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  
  const width = currentX - startBboxX;
  const height = currentY - startBboxY;
  
  box.style.width = `${Math.abs(width)}px`;
  box.style.height = `${Math.abs(height)}px`;
  box.style.left = `${width < 0 ? currentX : startBboxX}px`;
  box.style.top = `${height < 0 ? currentY : startBboxY}px`;
}

function stopDrawingBbox() {
  isDrawingBbox = false;
  // Mark answer input as coordinate details
  const container = document.getElementById('active-task-card');
  let hiddenInput = document.getElementById('task-answer-input');
  if (!hiddenInput) {
    hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'task-answer-input';
    container.appendChild(hiddenInput);
  }
  hiddenInput.value = 'drawn';
}

// Render RLHF Task
let selectedRlhfOption = null;
function renderRlhfTask(card, task) {
  const rlhfWrap = document.createElement('div');
  rlhfWrap.className = 'rlhf-container';
  
  const rowA = document.createElement('div');
  rowA.className = 'rlhf-card';
  rowA.onclick = () => selectRlhfOption('A', rowA, rowB);
  rowA.innerHTML = `
    <span class="rlhf-header">Response A</span>
    <pre class="rlhf-body" style="white-space: pre-wrap; font-family: monospace;">${task.responseA}</pre>
  `;
  
  const rowB = document.createElement('div');
  rowB.className = 'rlhf-card';
  rowB.onclick = () => selectRlhfOption('B', rowA, rowB);
  rowB.innerHTML = `
    <span class="rlhf-header">Response B</span>
    <pre class="rlhf-body" style="white-space: pre-wrap; font-family: monospace;">${task.responseB}</pre>
  `;
  
  rlhfWrap.appendChild(rowA);
  rlhfWrap.appendChild(rowB);
  card.appendChild(rlhfWrap);
  
  const explanation = document.createElement('textarea');
  explanation.className = 'transcription-input';
  explanation.placeholder = 'Provide a brief explanation for your choice (minimum 10 characters)...';
  explanation.id = 'task-explanation';
  card.appendChild(explanation);
  
  // hidden input to hold choice
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.id = 'task-answer-input';
  card.appendChild(hiddenInput);
}

function selectRlhfOption(opt, cardA, cardB) {
  selectedRlhfOption = opt;
  document.getElementById('task-answer-input').value = opt;
  
  if (opt === 'A') {
    cardA.classList.add('selected');
    cardB.classList.remove('selected');
  } else {
    cardB.classList.add('selected');
    cardA.classList.remove('selected');
  }
}

// 7. TASK ACTIONS
function skipTask() {
  state.activeTaskIndex++;
  loadTask();
}

function submitTask() {
  const input = document.getElementById('task-answer-input');
  if (!input || !input.value.trim()) {
    alert('Please complete the task input before submitting.');
    return;
  }
  
  const answer = input.value.trim().toLowerCase();
  const task = state.activeTask;
  const campaign = state.activeCampaign;
  
  let isCorrect = true;
  
  // Secret Honeypot Checks
  if (task.isHoneypot) {
    state.honeypotsTotal++;
    
    if (campaign.type === 'audio') {
      isCorrect = task.correctAnswers.some(ans => answer.includes(ans.toLowerCase()));
    } else if (campaign.type === 'bbox') {
      isCorrect = answer === 'drawn';
    } else if (campaign.type === 'rlhf') {
      const exp = document.getElementById('task-explanation').value.trim();
      isCorrect = (answer.toUpperCase() === task.correctChoice) && (exp.length >= 10);
    }
    
    if (isCorrect) {
      state.honeypotsPassed++;
      triggerHoneypotToast(true, `+$${campaign.rate.toFixed(2)} added to Pending.`);
    } else {
      triggerHoneypotToast(false, `Accuracy dipped. Payout frozen.`);
    }
    
    // Update accuracy
    state.accuracy = (state.honeypotsPassed / state.honeypotsTotal) * 100;
  } else {
    // Normal tasks just pass in the prototype demo
    triggerHoneypotToast(true, `+$${campaign.rate.toFixed(2)} added to Pending.`);
  }
  
  // Update Balances
  state.totalTasksCompleted++;
  state.pendingBalance += campaign.rate;
  
  // Qualification Check
  if (!state.isQualified) {
    state.qualificationTasksCompleted++;
    if (state.qualificationTasksCompleted >= 10) {
      if (state.accuracy >= 90.0) {
        state.isQualified = true;
        state.currentTier = 'silver';
        // Unlock pending to withdrawable
        state.withdrawableBalance += state.pendingBalance;
        state.pendingBalance = 0;
        alert('🎉 Congratulations! You passed the qualification test. Your account is upgraded to SILVER tier and your pending balance is unlocked!');
      } else {
        alert('❌ Qualification test failed. Accuracy is below 90%. Resetting training...');
        state.qualificationTasksCompleted = 0;
        state.pendingBalance = 0;
        state.accuracy = 100;
        state.honeypotsPassed = 0;
        state.honeypotsTotal = 0;
      }
    }
  } else {
    // Already qualified, check for tier promotions
    if (state.totalTasksCompleted >= 20 && state.accuracy >= 95 && state.currentTier === 'silver') {
      state.currentTier = 'gold';
      alert('🌟 Promotion! You have been promoted to GOLD tier for maintaining high accuracy!');
    }
  }
  
  // Load next task
  state.activeTaskIndex++;
  updateUI();
  loadTask();
}

// 8. TOAST NOTIFICATIONS
function triggerHoneypotToast(passed, bodyText) {
  const toast = document.getElementById('toast-container');
  const icon = document.getElementById('toast-icon');
  const header = document.getElementById('toast-header');
  const body = document.getElementById('toast-body');
  
  if (passed) {
    icon.className = 'toast-status-icon toast-pass';
    icon.innerText = '✓';
    header.innerText = 'Verification Passed';
    body.innerText = bodyText;
  } else {
    icon.className = 'toast-status-icon toast-fail';
    icon.innerText = '✗';
    header.innerText = 'Verification Mismatch';
    body.innerText = bodyText;
  }
  
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 4000);
}

// 9. CASHOUT SYSTEM
function openCashoutModal() {
  if (state.withdrawableBalance <= 0) return;
  
  state.selectedPayoutOption = 'free';
  state.withdrawalAmount = state.withdrawableBalance;
  
  // Reset selected styles
  document.getElementById('payout-opt-free').classList.add('selected');
  document.getElementById('payout-opt-instant').classList.remove('selected');
  document.getElementById('withdrawal-calculator').style.display = 'none';
  
  // Configure slider
  const slider = document.getElementById('withdrawal-slider');
  slider.max = state.withdrawableBalance.toFixed(2);
  slider.value = state.withdrawableBalance.toFixed(2);
  
  updateWithdrawalFeeMath();
  
  document.getElementById('cashout-modal').classList.remove('hidden');
}

function closeCashoutModal() {
  document.getElementById('cashout-modal').classList.add('hidden');
}

function selectPayoutOption(opt) {
  state.selectedPayoutOption = opt;
  const optFree = document.getElementById('payout-opt-free');
  const optInst = document.getElementById('payout-opt-instant');
  const calc = document.getElementById('withdrawal-calculator');
  
  if (opt === 'free') {
    optFree.classList.add('selected');
    optInst.classList.remove('selected');
    calc.style.display = 'none';
  } else {
    optFree.classList.remove('selected');
    optInst.classList.add('selected');
    calc.style.display = 'flex';
  }
  
  updateWithdrawalFeeMath();
}

function updateWithdrawalFeeMath() {
  const slider = document.getElementById('withdrawal-slider');
  const amount = parseFloat(slider.value) || 0.00;
  state.withdrawalAmount = amount;
  
  document.getElementById('calc-withdraw-label').innerText = `${amount.toFixed(2)} USDC`;
  
  if (state.selectedPayoutOption === 'free') {
    document.getElementById('calc-fee-label').innerText = '$0.00';
    document.getElementById('calc-net-receive').innerText = `$${amount.toFixed(2)}`;
  } else {
    const fee = 0.05 + (amount * 0.015);
    const net = Math.max(0, amount - fee);
    document.getElementById('calc-fee-label').innerText = `$${fee.toFixed(2)}`;
    document.getElementById('calc-net-receive').innerText = `$${net.toFixed(2)}`;
  }
}

function processCashout() {
  const opt = state.selectedPayoutOption;
  const amount = state.withdrawalAmount;
  
  if (amount <= 0) {
    alert('Please enter a valid cash-out amount.');
    return;
  }
  
  if (opt === 'free') {
    alert(`📅 Auto-Batch Scheduled!\nYour cash-out of $${amount.toFixed(2)} USDC will be processed in the next free daily batch.`);
    state.withdrawableBalance -= amount;
  } else {
    const fee = 0.05 + (amount * 0.015);
    const net = Math.max(0, amount - fee);
    alert(`⚡ Instant Cash-Out Successful!\nReleased $${net.toFixed(2)} USDC to wallet (fee deducted: $${fee.toFixed(2)} USDC).`);
    state.withdrawableBalance -= amount;
  }
  
  closeCashoutModal();
  updateUI();
}

// 12. EMPLOYER CAMPAIGN CREATION HANDLERS
function openCreateCampaignModal() {
  const modal = document.getElementById('create-campaign-modal');
  if (modal) {
    modal.classList.remove('hidden');
    calculateCampaignBudget();
  }
}

function closeCreateCampaignModal() {
  const modal = document.getElementById('create-campaign-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function calculateCampaignBudget() {
  const rateInput = document.getElementById('camp-rate');
  const countInput = document.getElementById('camp-count');
  const budgetLabel = document.getElementById('camp-total-budget');
  
  if (rateInput && countInput && budgetLabel) {
    const rate = parseFloat(rateInput.value) || 0;
    const count = parseInt(countInput.value) || 0;
    const total = (rate * count).toFixed(2);
    budgetLabel.innerText = `$${total} USDC`;
  }
}

function handleCreateCampaign(e) {
  e.preventDefault();
  
  const title = document.getElementById('camp-title').value.trim();
  const client = document.getElementById('camp-client').value.trim();
  const type = document.getElementById('camp-type').value;
  const tier = document.getElementById('camp-tier').value;
  const rate = parseFloat(document.getElementById('camp-rate').value) || 0.10;
  const count = parseInt(document.getElementById('camp-count').value) || 50;
  const totalBudget = rate * count;
  
  if (!title || !client) {
    alert('Please enter a title and organization name.');
    return;
  }
  
  // Sample task template based on selected modality
  let tasks = [];
  if (type === 'rlhf') {
    tasks = [
      {
        instruction: 'Evaluate the following Python function for concurrency safety and memory leaks. Grade 1-5.',
        modelA: 'def fetch_data():\n    results = []\n    for url in urls:\n        results.append(requests.get(url).text)\n    return results',
        modelB: 'async def fetch_data(session):\n    tasks = [session.get(url) for url in urls]\n    return await asyncio.gather(*tasks)',
        isHoneypot: false,
        correctAnswers: ['modelB', 'model b']
      }
    ];
  } else if (type === 'audio') {
    tasks = [
      {
        instruction: 'Transcribe spoken West African English audio accurately without hallucination.',
        audioUrl: 'mock-speech-1.wav',
        transcriptHint: 'Solana settles transactions in four hundred milliseconds',
        isHoneypot: false,
        correctAnswers: ['solana settles transactions in four hundred milliseconds']
      }
    ];
  } else {
    tasks = [
      {
        instruction: 'Draw a tight 2D bounding box around the vehicle in the frame.',
        imageBg: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=480',
        isHoneypot: false,
        correctCoordinates: { x: 120, y: 100, w: 150, h: 180 }
      }
    ];
  }
  
  const newCampaign = {
    id: `camp-${Date.now()}`,
    title: title,
    client: client,
    totalPool: totalBudget,
    remainingPool: totalBudget,
    rate: rate,
    requiredTier: tier,
    type: type,
    tasks: tasks
  };
  
  // Add campaign to global list and re-render
  campaigns.unshift(newCampaign);
  renderCampaigns();
  
  // Update count in header
  const countElem = document.getElementById('campaign-count');
  if (countElem) {
    countElem.innerText = `${campaigns.length} Campaigns`;
  }
  
  closeCreateCampaignModal();
  document.getElementById('create-campaign-form').reset();
  
  alert(`⚡ Campaign Launched Successfully!\nFunded $${totalBudget.toFixed(2)} USDC into Anchor PDA Escrow.\nDataset "${title}" is now active on the public job board.`);
}

