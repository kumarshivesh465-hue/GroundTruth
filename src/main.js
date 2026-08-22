import './style.css';
import { registerSW } from 'virtual:pwa-register';

// Registers the service worker so the app shell works offline after first load.
registerSW({ immediate: true });

const outlet = document.getElementById('screen-outlet');
const tabbar = document.getElementById('tabbar');
const netStatus = document.getElementById('net-status');

function setNetStatus() {
  netStatus.textContent = navigator.onLine ? 'online' : 'offline (fine \u2014 runs on-device)';
}
window.addEventListener('online', setNetStatus);
window.addEventListener('offline', setNetStatus);
setNetStatus();

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
      <h1>Recent Reports</h1>
      <p class="subtitle">Offline history will list here (IndexedDB) \u2014 build during the event.</p>
      <div class="placeholder">
        No reports yet. Tap "Capture" below to start a new one.
      </div>
    </section>
  `,

  capture: () => `
    <section class="screen">
      <h1>Capture</h1>
      <p class="subtitle">Live camera feed \u2014 wire up MediaPipe Tasks Vision here during the event.</p>
      <video id="camera-video" autoplay playsinline muted></video>
      <div style="height:14px"></div>
      <button class="btn" id="start-camera">Start Camera</button>
      <div style="height:10px"></div>
      <div class="placeholder">
        TODO (event day): run the frame through MediaPipe's Object Detector
        (@mediapipe/tasks-vision) and list detected objects here as
        structured evidence.
      </div>
    </section>
  `,

  claim: () => `
    <section class="screen">
      <h1>Claim</h1>
      <p class="subtitle">Voice capture \u2014 wire up Web Speech API (or Whisper via transformers.js) here.</p>
      <div class="placeholder">
        TODO (event day): use the SpeechRecognition Web API for a fast MVP,
        or @huggingface/transformers running a small Whisper model for a
        fully on-device version. Show the live transcript in this screen.
      </div>
    </section>
  `,

  reconcile: () => `
    <section class="screen">
      <h1>Reconcile</h1>
      <p class="subtitle">On-device LLM comparison \u2014 wire up WebLLM here.</p>
      <div class="placeholder">
        TODO (event day): load a small WebLLM model (e.g.
        Qwen2.5-1.5B-Instruct-q4f16_1-MLC) via @mlc-ai/web-llm and prompt it
        with the detected evidence + spoken claim to produce a
        Match / Mismatch verdict with reasoning.
      </div>
    </section>
  `,

  report: () => `
    <section class="screen">
      <h1>Report</h1>
      <p class="subtitle">Final reconciled report \u2014 build the report card UI here.</p>
      <div class="placeholder">
        TODO (event day): render the Match/Mismatch badge, the raw evidence,
        the raw claim, and save the report to IndexedDB for offline history.
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
