import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { triggerMatchFeedback, triggerMismatchFeedback } from './feedback.js';
import { captureObjectEvidence } from './vision.js';
import { reconcileEvidence } from './reconcile.js';
import { listChecks, saveCheck } from './check-store.js';
import { loadWhisper, transcribeBlob } from './speech.js';
import { captureAcousticResponse } from './acoustic.js';
import { runLlmReconciliation } from './llm.js';

registerSW({ immediate: true });

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/></svg>',
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l9.5 16.5H2.5z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/></svg>',
};

const outlet = document.getElementById('screen-outlet');
const tabbar = document.getElementById('tabbar');
const netDot = document.getElementById('net-dot');
const netLabel = document.getElementById('net-label');
let cameraStream = null;
let voiceStream = null;
let mediaRecorder = null;
let audioChunks = [];
let recordedAudio = null;
let history = [];
let currentCheck = newCheck();

function newCheck() {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), vision: { status: 'pending', label: null, confidence: 0, imageDataUrl: null }, claim: { text: '', source: 'typed transcript' }, acoustic: { status: 'pending' }, verdict: null };
}
function byId(id) { return document.getElementById(id); }
function safe(text) { return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function button(id, label, variant = '') { return `<button id="${id}" class="action-button ${variant}">${label}</button>`; }
function ring({ label, sublabel, percent = 0, color = '--border', icon = 'shield' }) { return `<div class="trust-ring-wrap"><div class="trust-ring" style="--ring-percent:${percent}%;--ring-color:var(${color})"><div class="trust-ring-inner">${ICONS[icon]}<div class="trust-ring-label">${label}</div><div class="trust-ring-sublabel">${sublabel}</div></div></div></div>`; }
function evidenceCard(title, detail, complete) { return `<div class="step-card"><div class="icon-chip ${complete ? '' : 'muted'}">${complete ? ICONS.check : ICONS.alert}</div><div class="step-card-body"><h3>${title}</h3><p>${safe(detail)}</p></div></div>`; }
function reportRow(check) { return `<div class="report-row"><div class="icon-chip ${check.verdict?.status === 'MATCH' ? '' : 'muted'}">${check.verdict?.status === 'MATCH' ? ICONS.check : ICONS.alert}</div><div class="report-row-body"><div class="report-row-title">${safe(check.verdict?.status || 'No verdict')}</div><div class="report-row-meta">${new Date(check.createdAt).toLocaleString()}</div></div></div>`; }

function setNetStatus() { const online = navigator.onLine; netDot.classList.toggle('offline', !online); netLabel.textContent = online ? 'Online' : 'Offline-ready'; }
window.addEventListener('online', setNetStatus); window.addEventListener('offline', setNetStatus); setNetStatus();

const TABS = [['home', 'Home', 'home'], ['capture', 'Capture', 'camera'], ['claim', 'Claim', 'mic'], ['reconcile', 'Reconcile', 'cpu'], ['report', 'Report', 'check']];
tabbar.innerHTML = TABS.map(([id, label, icon]) => `<button data-screen="${id}" class="tab">${ICONS[icon]}<span>${label}</span></button>`).join('');

const screens = {
  home: () => {
    const last = history[0];
    return `<section class="screen">${ring({ label: last ? last.verdict?.status || 'Saved check' : 'Ready to verify', sublabel: last ? 'MOST RECENT CHECK' : 'SESSION IDLE', percent: last?.verdict?.status === 'MATCH' ? 100 : 0, color: last?.verdict?.status === 'MATCH' ? '--accent' : '--border', icon: last?.verdict?.status === 'MATCH' ? 'check' : 'shield' })}<p class="trust-ring-caption">Capture evidence, record the delivery claim, then save a local receipt.</p>${button('start-check', 'Start a check →')}<div class="section-label" style="margin-top:22px">Recent reports</div>${last ? reportRow(last) : '<div class="placeholder">No checks saved yet. Start one when you are ready.</div>'}</section>`;
  },
  capture: () => `<section class="screen"><h1>Capture evidence</h1><p class="subtitle">Frame the delivery item, then capture an on-device object signal.</p><video id="camera-video" autoplay playsinline muted></video><div style="height:14px"></div>${button('start-camera', 'Start camera')}<div style="height:10px"></div>${button('capture-frame', 'Capture & detect')}<div id="vision-status" class="placeholder" style="display:none;margin-top:14px" role="status"></div><div id="captured-frame" style="display:none;margin-top:14px"></div><div style="height:12px"></div>${button('continue-claim', 'Continue to claim →')}</section>`,
  claim: () => `<section class="screen"><h1>Delivery claim</h1><p class="subtitle">Speak the delivery claim. Whisper transcribes it locally after the first model download.</p><div class="card"><div id="speech-status" class="form-hint" style="margin-top:0">Load the speech model once, then record your claim.</div><div style="height:10px"></div>${button('load-speech', 'Load on-device speech')}<div style="height:10px"></div>${button('record-claim', 'Record claim')}<div style="height:10px"></div>${button('stop-claim', 'Stop recording')}<div style="height:10px"></div>${button('transcribe-claim', 'Transcribe recording')}</div><div class="card"><label for="claim-text" style="font-weight:700;font-size:13px">Claim transcript</label><textarea id="claim-text" class="claim-input" rows="5" placeholder="Example: One full sealed LPG cylinder was delivered.">${safe(currentCheck.claim.text)}</textarea><p class="form-hint">Review and correct the transcript before continuing.</p></div>${button('save-claim', 'Save claim')}<div style="height:10px"></div>${button('continue-reconcile', 'Continue to reconcile →')}</section>`,
  reconcile: () => `<section class="screen"><h1>Reconcile evidence</h1><p class="subtitle">Capture the acoustic response, then ask the on-device model to review all available signals.</p>${evidenceCard('Vision frame', currentCheck.vision.status === 'detected' ? `Object signal: ${currentCheck.vision.label} (${Math.round(currentCheck.vision.confidence * 100)}%)` : 'Not captured yet', currentCheck.vision.status === 'detected')}${evidenceCard('Delivery claim', currentCheck.claim.text || 'Not entered yet', Boolean(currentCheck.claim.text))}${evidenceCard('Acoustic signal', currentCheck.acoustic.status === 'recorded' ? `Response captured · average energy ${currentCheck.acoustic.averageEnergy}` : 'Not recorded yet', currentCheck.acoustic.status === 'recorded')}<div id="acoustic-status" class="form-hint" style="margin:0 0 10px"></div>${button('run-acoustic', currentCheck.acoustic.status === 'recorded' ? 'Capture acoustic response again' : 'Run acoustic check')}<div style="height:10px"></div>${button('run-ai-review', 'Run on-device AI review →')}<div style="height:10px"></div>${button('run-local-fallback', 'Use local fallback instead', 'secondary')}</section>`,
  report: () => {
    const verdict = currentCheck.verdict;
    if (!verdict) return `<section class="screen"><h1>Report</h1><p class="subtitle">Run reconciliation after collecting evidence to create a local receipt.</p>${button('go-reconcile', 'Go to reconcile →')}</section>`;
    const isMatch = verdict.status === 'MATCH'; const isMismatch = verdict.status === 'MISMATCH';
    return `<section class="screen"><h1>Report</h1>${ring({ label: verdict.status, sublabel: verdict.source.toUpperCase(), percent: 100, color: isMatch ? '--accent' : isMismatch ? '--danger' : '--primary', icon: isMatch ? 'check' : isMismatch ? 'alert' : 'shield' })}<div class="card"><strong>${safe(verdict.reason)}</strong><p class="form-hint">Receipt ID: ${currentCheck.id.slice(0, 8).toUpperCase()} · Stored on this device</p></div>${button('share-receipt', 'Share receipt')}<div style="height:10px"></div>${button('new-check', 'Start another check')}</section>`;
  },
};

function render(name) {
  stopCamera(); stopVoiceCapture(); outlet.innerHTML = screens[name](); outlet.scrollTop = 0;
  [...tabbar.children].forEach((btn) => btn.classList.toggle('active', btn.dataset.screen === name));
  if (name === 'home') byId('start-check').onclick = () => { currentCheck = newCheck(); render('capture'); };
  if (name === 'capture') { byId('start-camera').onclick = startCamera; byId('capture-frame').onclick = captureFrame; byId('continue-claim').onclick = () => render('claim'); }
  if (name === 'claim') {
    byId('load-speech').onclick = prepareSpeech;
    byId('record-claim').onclick = startRecording;
    byId('stop-claim').onclick = stopRecording;
    byId('transcribe-claim').onclick = transcribeRecording;
    byId('stop-claim').disabled = true; byId('record-claim').disabled = true; byId('transcribe-claim').disabled = !recordedAudio;
    byId('save-claim').onclick = saveClaim; byId('continue-reconcile').onclick = () => { saveClaim(); render('reconcile'); };
  }
  if (name === 'reconcile') { byId('run-acoustic').onclick = runAcoustic; byId('run-ai-review').onclick = runAiReview; byId('run-local-fallback').onclick = runLocalFallback; }
  if (name === 'report') { byId('go-reconcile')?.addEventListener('click', () => render('reconcile')); byId('new-check')?.addEventListener('click', () => { currentCheck = newCheck(); render('capture'); }); byId('share-receipt')?.addEventListener('click', shareReceipt); }
}

async function startCamera() {
  const status = byId('vision-status');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const video = byId('camera-video'); video.srcObject = cameraStream; await video.play();
    status.style.display = 'block'; status.textContent = 'Camera ready. Capture one clear frame.';
  } catch (error) { status.style.display = 'block'; status.textContent = `Camera unavailable: ${error.message}. Use HTTPS or localhost and allow camera access.`; }
}
async function captureFrame() {
  const status = byId('vision-status'); const buttonEl = byId('capture-frame'); buttonEl.disabled = true;
  status.style.display = 'block'; status.textContent = 'Loading the on-device vision model…';
  try {
    currentCheck.vision = await captureObjectEvidence(byId('camera-video'));
    const vision = currentCheck.vision;
    status.textContent = vision.status === 'detected' ? `Object signal recorded: ${vision.label} (${Math.round(vision.confidence * 100)}%). This is general object evidence, not a seal certificate.` : 'No reliable object signal found. Try another clear frame.';
    byId('captured-frame').innerHTML = `<img class="captured-preview" alt="Captured delivery frame" src="${vision.imageDataUrl}">`;
    byId('captured-frame').style.display = 'block';
  } catch (error) { status.textContent = `Capture failed: ${error.message}`; } finally { buttonEl.disabled = false; }
}
function saveClaim() {
  const text = byId('claim-text')?.value.trim() || '';
  const source = text === currentCheck.claim.text ? currentCheck.claim.source : 'edited transcript';
  currentCheck.claim = { text, source };
}
function setSpeechStatus(message) { const status = byId('speech-status'); if (status) status.textContent = message; }
async function prepareSpeech() {
  const loadButton = byId('load-speech'); loadButton.disabled = true;
  try { await loadWhisper(setSpeechStatus); setSpeechStatus('Speech model ready on this device.'); byId('record-claim').disabled = false; }
  catch (error) { setSpeechStatus(`Speech model unavailable: ${error.message}. You can type the claim instead.`); }
  finally { loadButton.disabled = false; }
}
async function startRecording() {
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = []; mediaRecorder = new MediaRecorder(voiceStream);
    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    mediaRecorder.onstop = () => {
      recordedAudio = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      voiceStream?.getTracks().forEach((track) => track.stop()); voiceStream = null;
      setSpeechStatus('Recording captured. Transcribe it on-device.');
      if (byId('record-claim')) byId('record-claim').disabled = false;
      if (byId('stop-claim')) byId('stop-claim').disabled = true;
      if (byId('transcribe-claim')) byId('transcribe-claim').disabled = false;
    };
    mediaRecorder.start(); setSpeechStatus('Recording… speak the delivery claim now.');
    byId('record-claim').disabled = true; byId('stop-claim').disabled = false;
  } catch (error) { setSpeechStatus(`Microphone unavailable: ${error.message}. You can type the claim instead.`); }
}
function stopRecording() { if (mediaRecorder?.state === 'recording') mediaRecorder.stop(); }
async function transcribeRecording() {
  if (!recordedAudio) return;
  byId('transcribe-claim').disabled = true;
  try {
    const text = await transcribeBlob(recordedAudio, setSpeechStatus);
    byId('claim-text').value = text;
    currentCheck.claim = { text, source: 'on-device whisper' };
    setSpeechStatus(text ? 'Transcript ready. Review it before continuing.' : 'No speech was detected. Try recording again.');
  } catch (error) { setSpeechStatus(`Transcription failed: ${error.message}. You can type the claim instead.`); }
  finally { byId('transcribe-claim').disabled = false; }
}
async function runAcoustic() {
  const status = byId('acoustic-status'); const buttonEl = byId('run-acoustic');
  buttonEl.disabled = true; status.textContent = 'Preparing microphone access…';
  try {
    currentCheck.acoustic = await captureAcousticResponse((message) => { if (byId('acoustic-status')) byId('acoustic-status').textContent = message; });
    status.textContent = 'Acoustic response captured. It is stored as an uncalibrated signal, so it cannot independently prove fill level.';
    render('reconcile');
  } catch (error) { status.textContent = `Acoustic check unavailable: ${error.message}. You can still use the conservative fallback.`; }
  finally { if (byId('run-acoustic')) byId('run-acoustic').disabled = false; }
}
async function runAiReview() {
  const status = byId('acoustic-status'); const buttonEl = byId('run-ai-review');
  buttonEl.disabled = true; status.textContent = 'Preparing on-device AI review…';
  try { await finishVerdict(await runLlmReconciliation(currentCheck, (message) => { if (byId('acoustic-status')) byId('acoustic-status').textContent = message; })); }
  catch (error) { status.textContent = `WebLLM unavailable: ${error.message}. Use the local fallback instead.`; buttonEl.disabled = false; }
}
async function runLocalFallback() { await finishVerdict(reconcileEvidence(currentCheck)); }
async function finishVerdict(verdict) {
  currentCheck.verdict = verdict; await saveCheck(currentCheck); history = await listChecks();
  if (currentCheck.verdict.status === 'MATCH') triggerMatchFeedback();
  if (currentCheck.verdict.status === 'MISMATCH') triggerMismatchFeedback();
  render('report');
}
async function shareReceipt() {
  const text = `GroundTruth ${currentCheck.verdict.status}: ${currentCheck.verdict.reason} Receipt ${currentCheck.id.slice(0, 8).toUpperCase()}.`;
  try { if (navigator.share) await navigator.share({ title: 'GroundTruth receipt', text }); else { await navigator.clipboard.writeText(text); alert('Receipt copied to clipboard.'); } } catch { /* Sharing was cancelled. */ }
}
function stopCamera() { if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop()); cameraStream = null; }
function stopVoiceCapture() {
  if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
  if (voiceStream) voiceStream.getTracks().forEach((track) => track.stop());
  voiceStream = null;
}
tabbar.addEventListener('click', (event) => { const buttonEl = event.target.closest('button[data-screen]'); if (buttonEl) render(buttonEl.dataset.screen); });
listChecks().then((checks) => { history = checks; render('home'); }).catch(() => render('home'));
