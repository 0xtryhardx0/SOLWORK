// 1. STATE MANAGEMENT
let state = {
  currentView: 'landing', // 'landing', 'workspace', 'client'
  authRole: 'worker',     // 'worker' or 'client'
  clientActiveTab: 'create', // 'create', 'monitor', 'dispatch'
  workspaceModality: 'all',  // 'all', 'rlhf', 'audio', 'bbox'

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
// 3. INITIALIZATION & VIEW MANAGEMENT
document.addEventListener('DOMContentLoaded', () => {
  // Check hash for direct routing
  const hash = window.location.hash.toLowerCase();
  if (hash === '#workspace' || hash === '#workstation') {
    switchView('workspace', false);
  } else if (hash === '#client' || hash === '#clients') {
    switchView('client', false);
  } else {
    switchView('landing', false);
  }
  
  renderCampaigns();
  renderClientMonitorCampaigns();
  updateUI();
  initSubmissionsStream();

  // 6 PILLARS OF ASTONISHING AESTHETICS INITIALIZATION
  initNeuralCanvas();
  initTiltCards();
  initAudioHaptics();
  initCommandPalette();
  initRpcTerminal();
});

// View Switcher between Landing, Worker Workspace, and Clients Area
function switchView(viewName, updateHash = true) {
  if (updateHash && typeof playSfx === 'function') playSfx('click');
  state.currentView = viewName;
  
  // Hide all portal views
  const landingView = document.getElementById('view-landing');
  const workspaceView = document.getElementById('view-workspace');
  const clientView = document.getElementById('view-client');
  
  if (landingView) landingView.style.display = viewName === 'landing' ? 'block' : 'none';
  if (workspaceView) workspaceView.style.display = viewName === 'workspace' ? 'block' : 'none';
  if (clientView) clientView.style.display = viewName === 'client' ? 'block' : 'none';
  
  // Update navbar tab buttons
  const tabLanding = document.getElementById('nav-tab-landing');
  const tabWorkspace = document.getElementById('nav-tab-workspace');
  const tabClient = document.getElementById('nav-tab-client');
  
  if (tabLanding) tabLanding.classList.toggle('active', viewName === 'landing');
  if (tabWorkspace) tabWorkspace.classList.toggle('active', viewName === 'workspace');
  if (tabClient) tabClient.classList.toggle('active', viewName === 'client');
  
  // Update browser hash
  if (updateHash) {
    if (viewName === 'workspace') window.location.hash = 'workspace';
    else if (viewName === 'client') window.location.hash = 'client';
    else window.location.hash = 'home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  if (viewName === 'workspace') renderCampaigns();
  if (viewName === 'client') renderClientMonitorCampaigns();
}

// Workspace Modality Filter
function filterWorkspaceModality(modality) {
  if (typeof playSfx === 'function') playSfx('click');
  state.workspaceModality = modality;
  ['all', 'rlhf', 'audio', 'bbox'].forEach(m => {
    const btn = document.getElementById(`ws-filter-${m}`);
    if (btn) btn.classList.toggle('active', m === modality);
  });
  renderCampaigns();
}

// Render Campaigns dynamically
function renderCampaigns() {
  const container = document.getElementById('campaigns-grid');
  if (!container) return;
  container.innerHTML = '';
  
  const filtered = state.workspaceModality === 'all' 
    ? campaigns 
    : campaigns.filter(c => c.type === state.workspaceModality);
  
  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No active datasets found for this modality. Try selecting "All Datasets".</div>`;
    return;
  }
  
  filtered.forEach(c => {
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
  
  const countBadge = document.getElementById('campaign-count');
  if (countBadge) countBadge.innerText = `${filtered.length} Campaigns Active`;
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

// 8. INTERACTIVE PROTOCOL SANDBOX LOGIC
let currentSandboxModality = 'rlhf';

function setSandboxModality(modality) {
  currentSandboxModality = modality;
  
  // Tab buttons
  document.getElementById('tab-sb-rlhf').classList.toggle('active', modality === 'rlhf');
  document.getElementById('tab-sb-audio').classList.toggle('active', modality === 'audio');
  document.getElementById('tab-sb-vision').classList.toggle('active', modality === 'vision');
  
  // Content panels
  document.getElementById('sandbox-code-preview').style.display = modality === 'rlhf' ? 'block' : 'none';
  document.getElementById('sandbox-audio-preview').style.display = modality === 'audio' ? 'block' : 'none';
  document.getElementById('sandbox-vision-preview').style.display = modality === 'vision' ? 'block' : 'none';
  
  // Reward & PDA tags
  const rewardTag = document.getElementById('sandbox-reward-amount');
  const statusPill = document.getElementById('sandbox-status-pill');
  const txHash = document.getElementById('sandbox-tx-hash');
  
  statusPill.className = 'status-pill ready';
  statusPill.innerHTML = '● Ready for Verification';
  
  if (modality === 'rlhf') {
    rewardTag.innerText = '+0.65 USDC Reward';
    txHash.innerText = 'Anchor PDA Escrow: Seed ["campaign", DeepLogic, 0x9f]';
  } else if (modality === 'audio') {
    rewardTag.innerText = '+0.25 USDC Reward';
    txHash.innerText = 'Anchor PDA Escrow: Seed ["campaign", AetherVoice, 0x14]';
  } else {
    rewardTag.innerText = '+0.15 USDC Reward';
    txHash.innerText = 'Anchor PDA Escrow: Seed ["campaign", WayDrive, 0x4a]';
  }
}

function runSandboxVerification() {
  const statusPill = document.getElementById('sandbox-status-pill');
  const txHash = document.getElementById('sandbox-tx-hash');
  
  statusPill.className = 'status-pill processing';
  statusPill.innerHTML = '⚡ Checking Honeypot Consensus...';
  txHash.innerText = 'Signing Solana instruction: execute_task_payout (CPI SPL Transfer)...';
  
  setTimeout(() => {
    const randomSig = Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random()*58)]).join('');
    statusPill.className = 'status-pill verified';
    statusPill.innerHTML = '✓ Consensus Verified (Accuracy 100%)';
    txHash.innerHTML = `Settled on Solana Devnet: <span style="color: #14f195;">${randomSig.slice(0, 14)}...${randomSig.slice(-6)}</span> (342ms)`;
    
    // Increment contributor pending balance
    let bump = currentSandboxModality === 'rlhf' ? 0.65 : currentSandboxModality === 'audio' ? 0.25 : 0.15;
    state.withdrawableBalance += bump;
    state.totalTasksCompleted += 1;
    updateUI();
    
    showHoneypotToast(true, `Verified! +${bump.toFixed(2)} USDC credited to your SolWork balance in 342ms.`);
  }, 450);
}

// 9. ENTERPRISE ROI & ESCROW CALCULATOR LOGIC
let calcModality = 'code';

function setCalcModality(modality) {
  calcModality = modality;
  document.getElementById('calc-btn-code').classList.toggle('active', modality === 'code');
  document.getElementById('calc-btn-audio').classList.toggle('active', modality === 'audio');
  document.getElementById('calc-btn-vision').classList.toggle('active', modality === 'vision');
  
  const label = document.getElementById('calc-modality-display');
  const rateSlider = document.getElementById('calc-rate-slider');
  
  if (modality === 'code') {
    label.innerText = 'Python / STEM Code RLHF';
    rateSlider.value = 0.50;
  } else if (modality === 'audio') {
    label.innerText = 'Multilingual Audio & Speech';
    rateSlider.value = 0.20;
  } else {
    label.innerText = 'Computer Vision 2D/3D Bounding Box';
    rateSlider.value = 0.12;
  }
  
  updateLabRoiMath();
}

function updateLabRoiMath() {
  const taskCount = parseInt(document.getElementById('calc-task-slider').value) || 10000;
  const rate = parseFloat(document.getElementById('calc-rate-slider').value) || 0.50;
  
  document.getElementById('calc-task-count-display').innerText = `${taskCount.toLocaleString()} Tasks`;
  document.getElementById('calc-rate-display').innerText = `$${rate.toFixed(2)} USDC`;
  
  // SolWork cost = direct worker payout + 2.5% protocol fee
  const directPayout = taskCount * rate;
  const solworkTotal = directPayout * 1.025;
  
  // Scale AI / Web2 cost = 1.35x base rate + 30% overhead take-rate
  const web2Total = (taskCount * (rate * 1.25)) * 1.30;
  const savings = web2Total - solworkTotal;
  const savingsPercent = ((savings / web2Total) * 100).toFixed(1);
  
  document.getElementById('calc-solwork-price').innerText = `$${Math.round(solworkTotal).toLocaleString()}`;
  document.getElementById('calc-web2-price').innerText = `$${Math.round(web2Total).toLocaleString()}`;
  document.getElementById('calc-savings-percent').innerText = `${savingsPercent}% ($${Math.round(savings).toLocaleString()} Saved)`;
}

function deployCalculatedCampaign() {
  const taskCount = parseInt(document.getElementById('calc-task-slider').value) || 10000;
  const rate = parseFloat(document.getElementById('calc-rate-slider').value) || 0.50;
  
  openCreateCampaignModal();
  
  document.getElementById('camp-rate').value = rate.toFixed(2);
  document.getElementById('camp-count').value = Math.min(taskCount, 50000);
  document.getElementById('camp-type').value = calcModality === 'code' ? 'rlhf' : calcModality === 'audio' ? 'audio' : 'bbox';
  
  calculateCampaignBudget();
}

// 10. INVESTOR & ARCHITECTURE ONE-PAGER MODAL
function openInvestorModal() {
  const modal = document.getElementById('investor-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeInvestorModal() {
  const modal = document.getElementById('investor-modal');
  if (modal) modal.classList.add('hidden');
}

// 11. WEB3 AUTHENTICATION & ROLE SELECTION MODAL
function openAuthModal() {
  if (typeof playSfx === 'function') playSfx('click');
  if (state.walletConnected) {
    if (confirm(`Currently connected as ${state.authRole.toUpperCase()}: ${state.walletAddress}\nDo you want to disconnect?`)) {
      disconnectWallet();
    }
    return;
  }
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  if (typeof playSfx === 'function') playSfx('click');
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
}

function selectAuthRole(role) {
  if (typeof playSfx === 'function') playSfx('click');
  state.authRole = role;
  const workerOpt = document.getElementById('role-opt-worker');
  const clientOpt = document.getElementById('role-opt-client');
  if (workerOpt) workerOpt.classList.toggle('selected', role === 'worker');
  if (clientOpt) clientOpt.classList.toggle('selected', role === 'client');
}

function handleWalletSignIn() {
  // Check window.solana if available, otherwise sign simulated keypair
  state.walletConnected = true;
  state.walletAddress = '7Q9N...Vh';
  
  if (typeof playSfx === 'function') playSfx('connect');
  updateAuthUI();
  closeAuthModal();
  
  showHoneypotToast(true, `Signed in as ${state.authRole === 'worker' ? 'Contributor' : 'Enterprise AI Lab'}!`);
  
  // Transition to designated portal
  if (state.authRole === 'worker') {
    switchView('workspace');
  } else {
    switchView('client');
  }
}

function handleDemoSignIn() {
  state.walletConnected = true;
  state.walletAddress = '7Q9N...Vh';
  state.withdrawableBalance = 15.50; // Provide starting balance for testing
  
  if (typeof playSfx === 'function') playSfx('connect');
  updateAuthUI();
  closeAuthModal();
  
  showHoneypotToast(true, `Devnet Keypair active with 15.50 USDC! Entering ${state.authRole === 'worker' ? 'Workstation' : 'Clients Area'}.`);
  
  if (state.authRole === 'worker') {
    switchView('workspace');
  } else {
    switchView('client');
  }
}

function disconnectWallet() {
  if (typeof playSfx === 'function') playSfx('click');
  state.walletConnected = false;
  state.walletAddress = null;
  state.withdrawableBalance = 0.00;
  
  const walletBtn = document.getElementById('connect-wallet-btn');
  const walletText = document.getElementById('wallet-text');
  if (walletBtn) walletBtn.classList.remove('wallet-connected');
  if (walletText) walletText.innerText = 'Connect Phantom';
  
  updateUI();
  showHoneypotToast(false, 'Wallet session disconnected.');
}

function updateAuthUI() {
  const walletBtn = document.getElementById('connect-wallet-btn');
  const walletText = document.getElementById('wallet-text');
  if (walletBtn && walletText && state.walletConnected) {
    walletBtn.classList.add('wallet-connected');
    const roleIcon = state.authRole === 'worker' ? '🛠️' : '🏢';
    walletText.innerText = `${roleIcon} ${state.walletAddress}`;
  }
  updateUI();
}

// 12. ENTERPRISE CLIENT PORTAL LOGIC
function switchClientTab(tabName) {
  state.clientActiveTab = tabName;
  
  ['create', 'monitor', 'dispatch'].forEach(t => {
    const btn = document.getElementById(`client-subtab-${t}`);
    const panel = document.getElementById(`client-tab-${t}-panel`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (panel) panel.style.display = t === tabName ? 'block' : 'none';
  });
  
  if (tabName === 'monitor') renderClientMonitorCampaigns();
}

function calculateClientBudget() {
  const rate = parseFloat(document.getElementById('client-camp-rate').value) || 0.25;
  const count = parseInt(document.getElementById('client-camp-count').value) || 200;
  
  const workerPool = rate * count;
  const protocolFee = workerPool * 0.025;
  const total = workerPool + protocolFee;
  
  document.getElementById('client-worker-pool').innerText = `$${workerPool.toFixed(2)} USDC`;
  document.getElementById('client-protocol-fee').innerText = `$${protocolFee.toFixed(2)} USDC`;
  document.getElementById('client-total-escrow').innerText = `$${total.toFixed(2)} USDC`;
}

function handleClientCreateCampaign(e) {
  e.preventDefault();
  
  const title = document.getElementById('client-camp-title').value.trim();
  const org = document.getElementById('client-camp-org').value.trim();
  const type = document.getElementById('client-camp-type').value;
  const tier = document.getElementById('client-camp-tier').value;
  const rate = parseFloat(document.getElementById('client-camp-rate').value) || 0.25;
  const count = parseInt(document.getElementById('client-camp-count').value) || 200;
  const honeypot = document.getElementById('client-param-honeypot').value;
  const quorum = document.getElementById('client-param-quorum').value;
  const format = document.getElementById('client-param-format').value;
  const guidelines = document.getElementById('client-param-guidelines').value.trim();
  
  const totalBudget = rate * count;
  
  const newCampaign = {
    id: `client-camp-${Date.now()}`,
    title: title,
    client: org,
    totalPool: totalBudget,
    remainingPool: totalBudget,
    rate: rate,
    requiredTier: tier,
    type: type,
    honeypotRatio: `${honeypot}%`,
    quorum: `${quorum}%`,
    format: format,
    guidelines: guidelines || 'Standard ground-truth verification.',
    verifiedCount: 0,
    totalCount: count,
    tasks: [
      {
        instruction: `Verify submission according to rubric: ${guidelines || 'Deterministic ground truth.'}`,
        isHoneypot: false
      }
    ]
  };
  
  campaigns.unshift(newCampaign);
  renderCampaigns();
  
  // Update campaign counters
  const counterPill = document.getElementById('client-campaigns-counter');
  if (counterPill) counterPill.innerText = `${campaigns.length} Active`;
  
  // Reset form and switch to monitor tab
  document.getElementById('client-create-campaign-form').reset();
  calculateClientBudget();
  
  showHoneypotToast(true, `⚡ Escrow Locked! $${totalBudget.toFixed(2)} USDC placed into Anchor PDA for "${title}".`);
  switchClientTab('monitor');
}

// Client Campaigns Monitor List
const mockClientCampaigns = [
  {
    id: 'audio-transcribe',
    title: 'English Accents Speech Labeling',
    client: 'AetherVoice AI',
    type: 'African Audio',
    completed: 1480,
    total: 2000,
    escrowRemaining: 2250.00,
    consensusRate: '99.8%'
  },
  {
    id: 'rlhf-coding',
    title: 'Coding LLM Assistant Response Rating',
    client: 'DeepLogic Research',
    type: 'Python RLHF',
    completed: 1150,
    total: 1500,
    escrowRemaining: 11350.00,
    consensusRate: '99.4%'
  },
  {
    id: 'bbox-bounding',
    title: 'Autonomous Vehicle Obstacle Boxing',
    client: 'WayDrive Robotics',
    type: 'Vision 2D BBox',
    completed: 212,
    total: 500,
    escrowRemaining: 4120.00,
    consensusRate: '98.9%'
  }
];

function renderClientMonitorCampaigns() {
  const container = document.getElementById('client-active-campaigns-list');
  if (!container) return;
  container.innerHTML = '';
  
  mockClientCampaigns.forEach(c => {
    const percent = ((c.completed / c.total) * 100).toFixed(0);
    
    const row = document.createElement('div');
    row.className = 'client-campaign-row';
    row.innerHTML = `
      <div class="camp-row-top">
        <div class="camp-row-meta">
          <span class="pda-badge">${c.type}</span>
          <strong style="font-size: 1.05rem;">${c.title}</strong>
          <span style="font-size: 0.8rem; color: var(--text-muted);">&bull; ${c.client}</span>
        </div>
        <div class="camp-row-stats">
          <span class="stat-tag-sm">Progress: <strong>${c.completed.toLocaleString()} / ${c.total.toLocaleString()} (${percent}%)</strong></span>
          <span class="stat-tag-sm">PDA Balance: <strong>$${c.escrowRemaining.toLocaleString()} USDC</strong></span>
          <span class="stat-tag-sm">Consensus: <strong style="color: #14f195;">${c.consensusRate}</strong></span>
        </div>
      </div>
      <div class="client-progress-track">
        <div class="client-progress-fill" style="width: ${percent}%;"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

// 13. DATA EXTRACTION & DISPATCH
function handleRequestDataDispatch(e) {
  e.preventDefault();
  const email = document.getElementById('dispatch-email').value.trim();
  const campaign = document.getElementById('dispatch-campaign-select').value;
  const format = document.getElementById('dispatch-format-select').value.toUpperCase();
  
  alert(`📦 DATASET DISPATCH QUEUED!\n\nRecipient: ${email}\nDataset: ${campaign}\nFormat: ${format}\nProtocol Authority: xxii.services@gmail.com\n\nOur data engineering team has cryptographically verified consensus proofs. An authenticated dispatch link has been scheduled for transmission to ${email}.`);
  
  document.getElementById('dispatch-request-form').reset();
}

function downloadSampleJsonl() {
  const sampleData = [
    { id: "task-001", modality: "speech_audio", dialect: "Nigerian Pidgin / West African English", audio_duration_sec: 4.2, verified_transcript: "Solana settles transactions in four hundred milliseconds", honeypot_audit: "passed", quorum_score: 1.0, consensus_validators: 3, anchor_pda_tx: "5k2pM4xQ9vLtYw" },
    { id: "task-002", modality: "code_rlhf", language: "Python 3.12", prompt: "Evaluate async web scraping for race conditions", selected_model: "Model B (AsyncIO Semaphore)", safety_score: 5, accuracy_consensus: 0.99, anchor_pda_tx: "3n8qW2vPt7xKlM" },
    { id: "task-003", modality: "vision_bbox", object_class: "obstacle_vehicle", coordinates: { x: 120, y: 85, w: 180, h: 110 }, confidence_threshold: 0.986, validator_tier: "Silver", anchor_pda_tx: "9r4tY6uIo3pAsD" },
    { id: "task-004", modality: "speech_audio", dialect: "Yoruba Accented English", audio_duration_sec: 3.8, verified_transcript: "Non custodial smart escrows guarantee zero remittance friction", honeypot_audit: "passed", quorum_score: 1.0, consensus_validators: 3, anchor_pda_tx: "2v7bN9mK1lPoIu" },
    { id: "task-005", modality: "code_rlhf", language: "Rust Anchor", prompt: "Check PDA signer bump validation", selected_model: "Model A (Context Seeds Verification)", safety_score: 5, accuracy_consensus: 1.0, anchor_pda_tx: "7x1zC3vB5nMdFg" }
  ];
  
  const jsonlContent = sampleData.map(item => JSON.stringify(item)).join('\n');
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `solwork_verified_dataset_sample_${Date.now()}.jsonl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showHoneypotToast(true, 'Verified JSONL dataset sample downloaded successfully!');
}

// 14. REAL-TIME SUBMISSIONS STREAM SIMULATOR
const sampleSubmissions = [
  { worker: '0x8f...4e', location: 'Lagos', task: 'Nigerian Pidgin Audio Transcript', consensus: '3/3 Consensus (100%)', reward: '+0.25 USDC', time: '4s ago' },
  { worker: '0x3a...91', location: 'Nairobi', task: 'Python RLHF Concurrency Audit', consensus: 'Honeypot Gold Passed', reward: '+0.65 USDC', time: '12s ago' },
  { worker: '0xd1...87', location: 'Kigali', task: 'WayDrive 2D Obstacle Bounding Box', consensus: '98.6% IoU Match', reward: '+0.15 USDC', time: '21s ago' },
  { worker: '0x6c...14', location: 'Accra', task: 'Medical Terminology Phonetic Label', consensus: '3/3 Consensus (100%)', reward: '+0.40 USDC', time: '38s ago' },
  { worker: '0x9e...5a', location: 'Johannesburg', task: 'Rust SBF Security Constraint Rating', consensus: 'Honeypot Gold Passed', reward: '+0.80 USDC', time: '52s ago' }
];

function initSubmissionsStream() {
  const container = document.getElementById('client-submissions-stream');
  if (!container) return;
  container.innerHTML = '';
  
  sampleSubmissions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'audit-stream-item';
    item.innerHTML = `
      <div>
        <strong style="color: #14f195;">${s.worker}</strong> in <em>${s.location}</em> &bull;
        <span>${s.task}</span>
      </div>
      <div style="display: flex; gap: 14px; align-items: center;">
        <span style="font-size: 0.75rem; color: #a78bfa;">✓ ${s.consensus}</span>
        <strong style="color: #fff;">${s.reward}</strong>
        <span style="color: var(--text-muted); font-size: 0.7rem;">${s.time}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// ============================================================================
// 15. PILLAR 1: 60FPS KINETIC NEURAL CONSTELLATION CANVAS
// ============================================================================
let neuralCanvasState = {
  canvas: null,
  ctx: null,
  particles: [],
  mouse: { x: null, y: null, radius: 140 },
  animId: null
};

function initNeuralCanvas() {
  neuralCanvasState.canvas = document.getElementById('neural-canvas');
  if (!neuralCanvasState.canvas) return;
  neuralCanvasState.ctx = neuralCanvasState.canvas.getContext('2d');
  
  function resize() {
    neuralCanvasState.canvas.width = window.innerWidth;
    neuralCanvasState.canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  window.addEventListener('mousemove', (e) => {
    neuralCanvasState.mouse.x = e.clientX;
    neuralCanvasState.mouse.y = e.clientY;
  });
  
  window.addEventListener('mouseout', () => {
    neuralCanvasState.mouse.x = null;
    neuralCanvasState.mouse.y = null;
  });
  
  // Create particles
  const count = Math.min(Math.floor(window.innerWidth / 22), 65);
  neuralCanvasState.particles = [];
  for (let i = 0; i < count; i++) {
    neuralCanvasState.particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.65,
      vy: (Math.random() - 0.5) * 0.65,
      radius: Math.random() * 2 + 1.2,
      color: Math.random() > 0.45 ? 'rgba(20, 241, 149, ' : 'rgba(153, 69, 255, '
    });
  }
  
  function animate() {
    const { ctx, canvas, particles, mouse } = neuralCanvasState;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      
      // Draw node dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + '0.65)';
      ctx.fill();
      
      // Distance to cursor
      if (mouse.x !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(20, 241, 149, ${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }
      
      // Mutual node links
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          const alpha = (1 - dist / 110) * 0.22;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(153, 69, 255, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    
    neuralCanvasState.animId = requestAnimationFrame(animate);
  }
  animate();
}

// ============================================================================
// 16. PILLAR 2: ACETERNITY 3D CARD TILT & SPOTLIGHT GLARE
// ============================================================================
function initTiltCards() {
  const cards = document.querySelectorAll('.tilt-card, .stat-card, .campaign-card, .console-card, .beam-node-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = -((y - centerY) / centerY) * 6;
      const rotateY = ((x - centerX) / centerX) * 6;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.01, 1.01, 1.01)`;
      card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)';
    });
  });
}

// ============================================================================
// 17. PILLAR 3: WEB AUDIO API SYNTHESIZER MICRO-HAPTICS
// ============================================================================
let audioCtx = null;
let sfxEnabled = true;

function initAudioHaptics() {
  const saved = localStorage.getItem('solwork_sfx');
  if (saved !== null) {
    sfxEnabled = saved === 'true';
  }
  updateSfxIcon();
}

function updateSfxIcon() {
  const icon = document.getElementById('sfx-icon');
  if (icon) {
    icon.innerText = sfxEnabled ? '🔊' : '🔇';
  }
}

function toggleSfx() {
  sfxEnabled = !sfxEnabled;
  localStorage.setItem('solwork_sfx', sfxEnabled.toString());
  updateSfxIcon();
  if (sfxEnabled) {
    playSfx('click');
    showHoneypotToast(true, 'Synthesizer micro-haptics unmuted.');
  } else {
    showHoneypotToast(false, 'Audio micro-haptics muted.');
  }
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSfx(type = 'click') {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const now = ctx.currentTime;
  
  if (type === 'click') {
    // Crisp tactile click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  } else if (type === 'success') {
    // Dual bell chime
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.1, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.23);
    });
  } else if (type === 'connect') {
    // Solana 3-note ascending chord
    [440, 554.37, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.12, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.36);
    });
  } else if (type === 'escrow') {
    // Sub-second Anchor escrow settlement warp
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.22);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

// ============================================================================
// 18. PILLAR 4: SPOTLIGHT COMMAND PALETTE (RAYCAST / LINEAR STYLE ⌘K)
// ============================================================================
const commandPaletteItems = [
  { id: 'view-workstation', title: 'Open Task Workstation', desc: 'Browse AI microtasks and earn USDC', icon: '🛠️', badge: 'Earn', group: 'Navigation', action: () => switchView('workspace') },
  { id: 'view-client', title: 'Open Clients Area', desc: 'Enterprise data dispatch & campaign creation', icon: '🏢', badge: 'AI Labs', group: 'Navigation', action: () => switchView('client') },
  { id: 'view-overview', title: 'Protocol Overview & Architecture', desc: 'SolWork value proposition and benchmarks', icon: '🌐', badge: 'Home', group: 'Navigation', action: () => switchView('landing') },
  { id: 'mod-rlhf', title: 'Filter: RLHF Coding Datasets', desc: 'Python, Rust, and TypeScript logic evaluation', icon: '💻', badge: '0.65 USDC', group: 'Modality', action: () => { switchView('workspace'); filterWorkspaceModality('rlhf'); } },
  { id: 'mod-audio', title: 'Filter: Audio Speech Labeling', desc: 'African regional accents & dialect transcription', icon: '🎙️', badge: '0.15 USDC', group: 'Modality', action: () => { switchView('workspace'); filterWorkspaceModality('audio'); } },
  { id: 'mod-bbox', title: 'Filter: 2D Bounding Boxes', desc: 'Autonomous driving & robotics object annotation', icon: '🎯', badge: '0.08 USDC', group: 'Modality', action: () => { switchView('workspace'); filterWorkspaceModality('bbox'); } },
  { id: 'connect-wallet', title: 'Connect Solana Wallet', desc: 'Authenticate via Phantom or Devnet keypair', icon: '👻', badge: 'Web3', group: 'Protocol', action: () => openAuthModal() },
  { id: 'open-cashout', title: 'Instant Cashout / Claims', desc: 'Withdraw earned USDC via zero-fee Anchor escrow', icon: '💸', badge: 'Treasury', group: 'Protocol', action: () => openCashoutModal() },
  { id: 'view-deck', title: 'View Protocol One-Pager & Deck', desc: 'Problem, solution, unit economics & Solana synergy', icon: '📑', badge: 'Pitch', group: 'Protocol', action: () => openInvestorModal() },
  { id: 'open-terminal', title: 'Toggle On-Chain RPC Terminal', desc: 'Real-time Anchor PDA instruction stream', icon: '📟', badge: 'Devnet', group: 'Developer', action: () => toggleTerminalDrawer() },
  { id: 'toggle-sfx', title: 'Toggle Audio Micro-Haptics', desc: 'Mute or unmute Web Audio synthesizer sound effects', icon: '🔊', badge: 'Haptics', group: 'Developer', action: () => toggleSfx() }
];

let paletteActiveIndex = 0;
let filteredPaletteItems = [...commandPaletteItems];

function initCommandPalette() {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const palette = document.getElementById('command-palette');
      if (palette && !palette.classList.contains('hidden')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    }
  });
}

function openCommandPalette() {
  playSfx('click');
  const palette = document.getElementById('command-palette');
  const input = document.getElementById('palette-search-input');
  if (palette) {
    palette.classList.remove('hidden');
    if (input) {
      input.value = '';
      input.focus();
    }
    filterPaletteCommands();
  }
}

function closeCommandPalette() {
  playSfx('click');
  const palette = document.getElementById('command-palette');
  if (palette) {
    palette.classList.add('hidden');
  }
}

function handlePaletteBackdropClick(e) {
  if (e.target.id === 'command-palette') {
    closeCommandPalette();
  }
}

function filterPaletteCommands() {
  const query = (document.getElementById('palette-search-input')?.value || '').toLowerCase().trim();
  if (!query) {
    filteredPaletteItems = [...commandPaletteItems];
  } else {
    filteredPaletteItems = commandPaletteItems.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.desc.toLowerCase().includes(query) ||
      item.group.toLowerCase().includes(query) ||
      item.badge.toLowerCase().includes(query)
    );
  }
  paletteActiveIndex = 0;
  renderPaletteCommands();
}

function renderPaletteCommands() {
  const container = document.getElementById('palette-results-list');
  if (!container) return;
  
  if (filteredPaletteItems.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">No matching commands found. Try "workspace", "client", "rlhf", or "wallet".</div>`;
    return;
  }
  
  let html = '';
  let currentGroup = '';
  
  filteredPaletteItems.forEach((item, idx) => {
    if (item.group !== currentGroup) {
      currentGroup = item.group;
      html += `<div class="palette-group-title">${currentGroup}</div>`;
    }
    
    const isActive = idx === paletteActiveIndex ? 'active' : '';
    html += `
      <div class="palette-item ${isActive}" onclick="executePaletteCommand(${idx})">
        <div class="palette-item-left">
          <span class="palette-item-icon">${item.icon}</span>
          <div class="palette-item-content">
            <span class="palette-item-title">${item.title}</span>
            <span class="palette-item-desc">${item.desc}</span>
          </div>
        </div>
        <span class="palette-item-badge">${item.badge}</span>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function handlePaletteKeydown(e) {
  if (e.key === 'Escape') {
    closeCommandPalette();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (filteredPaletteItems.length > 0) {
      paletteActiveIndex = (paletteActiveIndex + 1) % filteredPaletteItems.length;
      renderPaletteCommands();
      playSfx('click');
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (filteredPaletteItems.length > 0) {
      paletteActiveIndex = (paletteActiveIndex - 1 + filteredPaletteItems.length) % filteredPaletteItems.length;
      renderPaletteCommands();
      playSfx('click');
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (filteredPaletteItems[paletteActiveIndex]) {
      executePaletteCommand(paletteActiveIndex);
    }
  }
}

function executePaletteCommand(index) {
  const item = filteredPaletteItems[index];
  if (item && item.action) {
    closeCommandPalette();
    item.action();
  }
}

// ============================================================================
// 19. PILLAR 5 & 6: ON-CHAIN ANCHOR RPC TERMINAL DRAWER
// ============================================================================
let currentDevnetSlot = 312849201;
let terminalInterval = null;

const rpcEventsPool = [
  { type: 'pda', tag: 'PDA_ESCROW', msg: 'Anchor::init_campaign_escrow [seed: "campaign", creator: 0x8f...4e, vault: $2,500 USDC]' },
  { type: 'tx', tag: 'SUBMIT_TX', msg: 'Anchor::verify_task_submission [worker: 0x3a...91, task: "Python RLHF Concurrency"]' },
  { type: 'quorum', tag: 'QUORUM_OK', msg: 'ConsensusEngine::quorum_reached [votes: 3/3, consensus_score: 1.00]' },
  { type: 'audit', tag: 'HONEYPOT', msg: 'HoneypotOracle::validate_trap [seed_hash: 0x7c...fa, result: PASSED (100%)]' },
  { type: 'tx', tag: 'CPI_RELEASE', msg: 'Anchor::release_pda_escrow_cpi [transfer: 0.65 USDC -> 0x3a...91, latency: 388ms]' },
  { type: 'pda', tag: 'PDA_UPDATE', msg: 'Anchor::update_worker_reputation [account: 0x3a...91, tier: GOLD, accuracy: 100%]' },
  { type: 'tx', tag: 'SUBMIT_TX', msg: 'Anchor::verify_task_submission [worker: 0xd1...87, task: "WayDrive 2D Obstacle Box"]' },
  { type: 'audit', tag: 'IOU_AUDIT', msg: 'VisionConsensus::compute_iou [iou_score: 0.986, threshold: 0.95 -> ACCEPTED]' },
  { type: 'tx', tag: 'CPI_RELEASE', msg: 'Anchor::release_pda_escrow_cpi [transfer: 0.15 USDC -> 0xd1...87, latency: 412ms]' }
];

function initRpcTerminal() {
  rpcEventsPool.slice(0, 4).forEach(e => appendTerminalLog(e));
  
  if (!terminalInterval) {
    terminalInterval = setInterval(() => {
      currentDevnetSlot += Math.floor(Math.random() * 3) + 1;
      const btn = document.getElementById('terminal-trigger-btn');
      if (btn) {
        const textSpan = btn.querySelector('.terminal-btn-text');
        if (textSpan) {
          textSpan.innerText = `⚡ Devnet Slot #${currentDevnetSlot.toLocaleString()} \u2022 Anchor 0.29 Logs`;
        }
      }
      
      const randEvent = rpcEventsPool[Math.floor(Math.random() * rpcEventsPool.length)];
      appendTerminalLog(randEvent);
    }, 3600);
  }
}

function appendTerminalLog(event) {
  const container = document.getElementById('terminal-log-stream');
  if (!container) return;
  
  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(Math.floor(d.getMilliseconds()/10)).padStart(2,'0')}`;
  const mockSig = Array.from({length: 10}, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]).join('');
  
  const line = document.createElement('div');
  line.className = 'term-log-entry';
  line.innerHTML = `
    <span class="term-time">[${timeStr}]</span>
    <span class="term-type ${event.type}">[${event.tag}]</span>
    <span class="term-msg">${event.msg}</span>
    <span class="term-tx">sig: 5${mockSig}...</span>
  `;
  
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

function toggleTerminalDrawer() {
  playSfx('click');
  const drawer = document.getElementById('terminal-drawer');
  const chevron = document.querySelector('.terminal-chevron');
  if (drawer) {
    const isHidden = drawer.classList.contains('hidden');
    drawer.classList.toggle('hidden');
    if (chevron) chevron.innerText = isHidden ? '▼' : '▲';
  }
}

function clearTerminalLogs() {
  playSfx('click');
  const container = document.getElementById('terminal-log-stream');
  if (container) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.72rem;">Terminal buffer flushed. Waiting for next Solana RPC event...</div>`;
  }
}
