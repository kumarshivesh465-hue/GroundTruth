import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { triggerMatchFeedback, triggerMismatchFeedback } from './feedback.js';

// Registers the service worker so the app shell works offline after first load.
registerSW({ immediate: true });

// ---------------------------------------------------------------------------
// ICONS \u2014 hand-authored, stroke-based, single source of truth. Kept as
// inline SVG (not an icon font/CDN) so the whole UI stays truly offline-first.
// ---------------------------------------------------------------------------
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
};

// ---------------------------------------------------------------------------
// SMALL UI HELPERS
// ---------------------------------------------------------------------------

// Liquid-effect button (see .liquid-button in style.css).
// variant: '' for primary teal, 'danger' for the red mismatch style.
function liquidBtn(id, label, { variant = '', icon = '', style = '' } = {}) {
  return `
    <button id="${id}" class="liquid-button ${variant}" style="${style}">
      <span class="text">${icon ? `<span style="width:16px;height:16px;display:inline-flex">${icon}</span>` : ''}${label}</span>
      <span class="liquid"></span>
      <span class="liquid"></span>
      <span class="liquid"></span>
      <span class="liquid"></span>
    </button>
  `;
}

function iconChip(iconKey, muted = false) {
  return `<div class="icon-chip ${muted ? 'muted' : ''}">${ICONS[iconKey]}</div>`;
}

function stepCard(iconKey, title, description, bodyHtml = '') {
  return `
    <div class="step-card">
      ${iconChip(iconKey)}
      <div class="step-card-body">
        <h3>${title}</h3>
        <p>${description}</p>
        ${bodyHtml}
      </div>
    </div>
  `;
}

// The Trust Ring \u2014 reused as an empty state on Home and as the filled
// verdict on Report. percent/color/icon together represent how much
// evidence is confirmed, not a decorative donut.
function trustRing({ percent = 0, colorVar = '--border', icon = 'shield', label, sublabel }) {
  return `
    <div class="trust-ring-wrap">
      <div class="trust-ring" style="--ring-percent:${percent}%; --ring-color:var(${colorVar});">
        <div class="trust-ring-inner">
          ${ICONS[icon]}
          <div class="trust-ring-label">${label}</div>
          ${sublabel ? `<div class="trust-ring-sublabel">${sublabel}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// APP SHELL
// ---------------------------------------------------------------------------

const outlet = document.getElementById('screen-outlet');
const tabbar = document.getElementById('tabbar');
const netDot = document.getElementById('net-dot');
const netLabel = document.getElementById('net-label');

function setNetStatus() {
  const online = navigator.onLine;
  netDot.classList.toggle('offline', !online);
  netLabel.textContent = online ? 'Online' : 'Offline-ready';
}
window.addEventListener('online', setNetStatus);
window.addEventListener('offline', setNetStatus);
setNetStatus();

const TABS = [
  ['home', 'Home', 'home'],
  ['capture', 'Capture', 'camera'],
  ['claim', 'Claim', 'mic'],
  ['reconcile', 'Reconcile', 'cpu'],
  ['report', 'Report', 'check'],
];
tabbar.innerHTML = TABS.map(([id, label, icon], i) => `
  <button data-screen="${id}" class="tab ${i === 0 ? 'active' : ''}">
    ${ICONS[icon]}
    <span>${label}</span>
  </button>
`).join('');

// ---------------------------------------------------------------------------
// SCREENS
// These are intentionally placeholders. This is a NAVIGATION SKELETON only,
// for the team to learn the shape of the app before the event.
// Do NOT build out the actual GroundTruth logic here ahead of time \u2014
// per the hackathon build rules, real application code must be written
// during the 30-hour event window. Use this only to confirm the shell works
// end-to-end on the actual iQOO phone (camera permission, install prompt,
// offline reload) before check-in.
// ---------------------------------------------------------------------------

const screens = {
  home: () => `
    <section class="screen">
      ${trustRing({
        percent: 0,
        colorVar: '--border',
        icon: 'shield',
        label: 'No checks yet',
        sublabel: 'SESSION IDLE',
      })}
      <p class="trust-ring-caption" style="margin:-10px auto 20px;">
        Once you run a check, this ring fills with your session's match rate.
      </p>
      <div class="section-label">Recent reports</div>
      <div class="placeholder">
        Nothing logged yet. Tap <strong>Capture</strong> below to start your first check.
      </div>
    </section>
  `,

  capture: () => `
    <section class="screen">
      <h1>Capture</h1>
      <p class="subtitle">Point the camera at what you're checking.</p>
      <video id="camera-video" autoplay playsinline muted></video>
      <div style="height:14px"></div>
      ${liquidBtn('start-camera', 'Start Camera', { icon: ICONS.camera })}
      <div style="height:16px"></div>
      ${stepCard('camera', 'Vision evidence', 'Wire up MediaPipe\u2019s Object Detector here during the event to turn the frame into structured evidence (e.g. seal intact, item detected).')}
      ${stepCard('mic', 'Acoustic check', 'Stretch goal, after the above works: emit a tone sweep via the Web Audio API for a second, independent fill-level signal. Prototype first in /playground/acoustic-test.html.')}
    </section>
  `,

  claim: () => `
    <section class="screen">
      <h1>Claim</h1>
      <p class="subtitle">Speak what you're reporting.</p>
      ${stepCard('mic', 'Voice capture', 'Wire up the Web Speech API for a fast MVP, or transformers.js running a small Whisper model for a fully on-device version. Show the live transcript here.')}
    </section>
  `,

  reconcile: () => `
    <section class="screen">
      <h1>Reconcile</h1>
      <p class="subtitle">The on-device model compares evidence to claim.</p>
      ${stepCard('cpu', 'On-device LLM', 'Load a small WebLLM model (e.g. Qwen2.5-1.5B-Instruct-q4f16_1-MLC) via @mlc-ai/web-llm and prompt it with the evidence + claim to produce a Match / Mismatch verdict with reasoning.')}
      ${stepCard('shield', 'Cloud fallback', 'Only if WebGPU underperforms on the loaner phone: fall back to the same prompt via OpenRouter\u2019s hosted API. Keep this as a documented backup \u2014 don\u2019t demo on it unless the on-device path genuinely fails.')}
    </section>
  `,

  report: () => `
    <section class="screen">
      <h1>Report</h1>
      <p class="subtitle">Final verdict \u2014 build the full report card during the event.</p>
      <div id="verdict-ring">
        ${trustRing({ percent: 0, colorVar: '--border', icon: 'shield', label: 'Awaiting check', sublabel: 'NO VERDICT YET' })}
      </div>
      <p class="subtitle" style="text-align:center;margin:-8px 0 18px;">Try the feedback now (works with no AI wired up yet):</p>
      <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
        ${liquidBtn('sim-match', 'Simulate MATCH', { icon: ICONS.check })}
        ${liquidBtn('sim-mismatch', 'Simulate MISMATCH', { variant: 'danger', icon: ICONS.alert })}
      </div>
    </section>
  `,
};

let cameraStream = null;

function render(name) {
  outlet.innerHTML = screens[name]();

  [...tabbar.children].forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  if (name === 'capture') {
    document.getElementById('start-camera').addEventListener('click', startCamera);
  } else {
    stopCamera();
  }

  if (name === 'report') {
    document.getElementById('sim-match').addEventListener('click', () => {
      showVerdictRing('MATCH');
      triggerMatchFeedback();
    });
    document.getElementById('sim-mismatch').addEventListener('click', () => {
      showVerdictRing('MISMATCH');
      triggerMismatchFeedback();
    });
  }
}

function showVerdictRing(verdict) {
  const el = document.getElementById('verdict-ring');
  if (!el) return;
  const isMatch = verdict === 'MATCH';
  el.innerHTML = trustRing({
    percent: 100,
    colorVar: isMatch ? '--accent' : '--danger',
    icon: isMatch ? 'check' : 'alert',
    label: verdict,
    sublabel: isMatch ? 'EVIDENCE CONFIRMED' : 'MISMATCH FLAGGED',
  });
}

async function startCamera() {
  const video = document.getElementById('camera-video');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    video.srcObject = cameraStream;
  } catch (err) {
    alert(
      'Camera access failed: ' + err.message +
      '\n\nOn a phone, camera access needs a secure context (https, or ' +
      'localhost via Chrome port-forwarding \u2014 see README).'
    );
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
}

tabbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-screen]');
  if (btn) render(btn.dataset.screen);
});

render('home');
