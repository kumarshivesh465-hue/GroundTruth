// Sensory feedback for a Match/Mismatch verdict: vibration + full-screen
// flash + a short synthesized alert tone. No audio files needed \u2014 tones
// are generated with the Web Audio API.
//
// Usage once the real reconciliation logic is wired up during the event:
//
//   import { triggerMatchFeedback, triggerMismatchFeedback } from './feedback.js';
//   if (verdict === 'MISMATCH') triggerMismatchFeedback();
//   else triggerMatchFeedback();

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Verdict feedback is decorative: it must never fire when the user has asked
// the OS to reduce motion, and it must never throw into a render path.
function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  } catch {
    return false;
  }
}

function playTone(freq, startTime, duration, { wave = 'sine', peakGain = 0.25 } = {}) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Short attack/decay envelope so tones don't click.
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

function flashScreen(color, duration = 500) {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.background = color;
  el.style.zIndex = '9999';
  el.style.pointerEvents = 'none';
  el.style.opacity = '0';
  el.style.transition = `opacity ${duration * 0.25}ms ease-out`;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '0.55';
    setTimeout(() => {
      el.style.transition = `opacity ${duration * 0.6}ms ease-in`;
      el.style.opacity = '0';
      setTimeout(() => el.remove(), duration * 0.6 + 50);
    }, duration * 0.25);
  });
}

function vibrate(pattern) {
  try {
    // Chrome rejects navigator.vibrate() unless the user has already interacted
    // with the page, and logs a console error when it does. Skipping the call is
    // both quieter and equivalent, since a blocked call has no effect anyway.
    if (navigator.userActivation && navigator.userActivation.hasBeenActive === false) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* Vibration API is optional and may be blocked. */ }
}

// Audio playback is likewise gated on a prior user gesture in most browsers.
function audioUnlocked() {
  try {
    return !navigator.userActivation || navigator.userActivation.hasBeenActive !== false;
  } catch {
    return true;
  }
}

// Browsers require a user gesture before audio can start. A verdict screen is
// reached from a tap, so resuming here is safe; failures stay silent.
function resumeAudio() {
  if (!audioUnlocked()) return null;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Sharp double-buzz + red flash + descending alarm beep. */
export function triggerMismatchFeedback() {
  vibrate([80, 60, 80, 60, 200]);
  if (!prefersReducedMotion()) flashScreen('#C0392B', 550);

  const ctx = resumeAudio();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime;
    playTone(880, t0, 0.14, { wave: 'square', peakGain: 0.22 });
    playTone(440, t0 + 0.18, 0.22, { wave: 'square', peakGain: 0.22 });
  } catch { /* Never let decorative audio break a verdict render. */ }
}

/** Single soft pulse + green flash + a gentle rising chime. */
export function triggerMatchFeedback() {
  vibrate(40);
  if (!prefersReducedMotion()) flashScreen('#02C39A', 400);

  const ctx = resumeAudio();
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime;
    playTone(523.25, t0, 0.16, { wave: 'sine', peakGain: 0.2 }); // C5
    playTone(784.0, t0 + 0.1, 0.22, { wave: 'sine', peakGain: 0.2 }); // G5
  } catch { /* Never let decorative audio break a verdict render. */ }
}

/** Recheck is deliberately silent: it is not a verdict, just a request to retry. */
export function triggerRecheckFeedback() {
  vibrate([30, 40, 30]);
}
