# GroundTruth

**Say what happened. The phone checks if it's true.**

An offline-first PWA built for the **iQOO Hackathon 2026** (Chennai City Battle, Productivity track). GroundTruth lets a field worker photograph what they're reporting on and speak their claim out loud — then an on-device AI pipeline independently cross-checks the claim against what the camera actually detected, fully offline, on the phone.

---

## Table of contents

- [The problem](#the-problem)
- [How it works](#how-it-works)
- [Why the phone is essential](#why-the-phone-is-essential)
- [Project status](#project-status)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Testing on a phone](#testing-on-a-phone)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Hackathon build-rule note](#hackathon-build-rule-note)
- [Acknowledgments](#acknowledgments)

---

## The problem

Field reporting — deliveries, warehouse counts, on-site surveys — still runs on the honor system. A worker says or types what they observed, and it's taken at face value, with no fast way to check it, especially in the low-connectivity environments (warehouses, basements, rural routes) where most of this reporting actually happens.

## How it works

```
[Camera Frame] ──► on-device vision model ──► detected evidence (JSON)
                                                        │
[Mic Audio]    ──► on-device speech-to-text ──► spoken claim (text)
                                                        │
                                                        ▼
                                    on-device LLM reconciliation
                             "Does the evidence match the claim? Explain."
                                                        │
                                                        ▼
                              MATCH / MISMATCH + plain-English reasoning
```

Every step above runs **client-side, in the browser**, with zero network calls once the models are cached — no backend server.

## Why the phone is essential

| Capability | Role |
|---|---|
| Camera | Primary evidence source |
| Microphone | Captures the claim being reconciled |
| Snapdragon GPU (via WebGPU) | Runs the local LLM reconciliation on-device |
| Offline support | Whole pipeline works with zero connectivity |
| Office Kit | Bridges phone + laptop for fast iteration during the build |

A cloud chatbot can't do this job — it needs connectivity the target environment doesn't have. A laptop app can't do this job — it isn't in the field. The phone isn't a display surface here; it's where the actual inference happens.

## Project status

This repo currently ships a **validated navigation shell**, not the product. That's intentional — see [the build-rule note](#hackathon-build-rule-note) below.

| Screen | Current state | Built during the event |
|---|---|---|
| Home | Empty placeholder | Load offline report history from IndexedDB |
| Capture | ✅ Live camera preview works | + MediaPipe object detection → evidence JSON |
| Claim | Empty placeholder | + Web Speech API / Whisper → transcript |
| Reconcile | Empty placeholder | + WebLLM (Qwen2.5-1.5B) → Match/Mismatch + reasoning |
| Report | Empty placeholder | Render verdict + evidence + claim, save to IndexedDB |

What **is** already validated on real hardware:
- [x] PWA installs to the home screen and runs full-screen
- [x] Service worker caches the app shell — works with zero connectivity
- [x] Camera access confirmed over HTTPS
- [x] WebGPU confirmed available for on-device inference
- [x] Manifest + install criteria pass Chrome's checks

## Tech stack

| Layer | Technology |
|---|---|
| App shell | Vite (vanilla JS) |
| PWA | `vite-plugin-pwa` — manifest + service worker |
| Camera | `navigator.mediaDevices.getUserMedia()` |
| Vision (planned) | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector) — Object Detector |
| Speech (planned) | Web Speech API, or [`@huggingface/transformers`](https://huggingface.co/docs/transformers.js) running Whisper-tiny for a fully local option |
| Reasoning (planned) | [WebLLM](https://webllm.mlc.ai/) running `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` on-device via WebGPU |
| Storage (planned) | IndexedDB |
| Hosting | Netlify (static, HTTPS) |

## Getting started

```bash
npm install
npm run dev       # starts Vite at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```

## Testing on a phone

`getUserMedia` needs a secure context (`https://` or `localhost`). A plain `http://<lan-ip>:5173` on a phone will be blocked. Two options:

**Chrome DevTools port forwarding (fastest for dev):**
1. Connect the phone via USB (or Office Kit's bridge)
2. On the laptop: `chrome://inspect#devices` → Port forwarding → map device port `5173` → `localhost:5173`
3. On the phone, open `http://localhost:5173` in Chrome — treated as secure

**Deploy to Netlify:** push to get a real `https://` URL, closer to the final demo setup.

Also try the standalone learning pages once on a real phone before the event:
- `/playground/webllm-test.html` — loads a small model fully in-browser, runs one test prompt
- `/playground/mediapipe-test.html` — live camera + on-device object detection boxes

## Project structure

```
groundtruth-starter/
├── index.html              # app shell entry point
├── vite.config.js          # Vite + PWA plugin config
├── src/
│   ├── main.js              # router between the 5 screens + camera logic
│   └── style.css
├── playground/
│   ├── webllm-test.html     # standalone WebLLM sanity check
│   └── mediapipe-test.html  # standalone MediaPipe sanity check
└── public/
    ├── icon-192.png
    └── icon-512.png
```

## Roadmap

**During the 30-hour build (Sep 12–13):**
1. Wire MediaPipe Object Detector into the Capture screen → structured evidence
2. Wire speech-to-text into the Claim screen → transcript
3. Wire WebLLM into the Reconcile screen → Match/Mismatch verdict + reasoning
4. Build the Report screen + IndexedDB history
5. Test repeatedly on the iQOO loaner phone, deploy final build, submit repo + demo

**Beyond the hackathon:**
- Broader condition-check categories as on-device detection models improve
- Multilingual claims (Tamil, Hindi) via a multilingual Whisper model
- A supervisor "digest" view aggregating flagged reports across a team

## Hackathon build-rule note

Per the iQOO Hackathon 2026 rules, code for the judged submission must be written during the event window, and pre-built complete products aren't allowed. This repo is pushed ahead of the event as an **environment and feasibility check only** — confirming the toolchain, camera/mic permissions, offline caching, and WebGPU availability all work on real hardware before the clock starts. The actual product logic (vision, speech, reconciliation) is built live during the 30-hour City Battle, on top of this shell.

## Acknowledgments

Built with these open-source projects:
- [Vite](https://vitejs.dev/) & [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe)
- [WebLLM](https://webllm.mlc.ai/)
- [transformers.js](https://huggingface.co/docs/transformers.js)

---

*iQOO Hackathon 2026 · Chennai City Battle · Productivity Track*
