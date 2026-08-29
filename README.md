# GroundTruth

**Say what happened. The phone checks if it's true.**

GroundTruth is an offline-first Progressive Web App that independently verifies field-delivery claims — catching LPG cylinder under-filling and tampering in seconds, entirely on the phone, with zero connectivity required.

🔗 **Live demo:** [splendorous-sable-b083e5.netlify.app](https://6a89e05ae350dfd664c35636--splendorous-sable-b083e5.netlify.app/)

---

## The problem

LPG delivery in India runs almost entirely on trust: an agent states what was delivered, and that claim is rarely independently checked — especially at doorsteps and in low-connectivity areas where a cloud-based tool couldn't help anyway. Tampered seals and under-filled cylinders are a widely reported, ongoing consumer-safety issue.

## How it works

A worker photographs the cylinder, taps it for an acoustic check, and speaks their claim. GroundTruth gathers all three signals independently and reconciles them on-device — the claim is no longer the end of the story, it's one input that gets checked.

```
Camera ──────────► visual evidence (seal intact, item detected)
Speaker + Mic ────► acoustic evidence (fill-level via resonance sweep)
Voice ────────────► spoken claim (speech-to-text)
                              │
                              ▼
                 on-device LLM reconciliation
                              │
                              ▼
              MATCH / MISMATCH + plain-English reasoning
```

Every step runs client-side, in the browser — no backend, no network call at inference time.

## Why the phone

- **Camera** — the primary evidence source, detecting what's actually in front of it
- **Speaker + mic** — an active tone sweep senses fill-level via resonance, no extra hardware needed
- **On-device GPU (WebGPU)** — runs the local LLM reconciliation entirely on-device
- **Offline-first** — the full pipeline works with zero connectivity, exactly where field verification is needed most

## Interface

Built phone-first, not adapted from a desktop layout: the app frame stays phone-shaped even in a browser window, every touch target meets accessibility sizing, and layout, type scale, and spacing all respond down to small devices. A few things worth trying:

- **Trust Ring** — a single visual motif reused across the app: a muted ring on Home before any check has run, filling with color the moment a verdict comes in (teal for Match, red for Mismatch)
- **Sensory verdict feedback** — a mismatch triggers a distinct vibration pattern, a red screen flash, and an alert tone; a match gets a lighter pulse and a soft chime — built with the Vibration and Web Audio APIs, no audio files needed
- Try it: open the **Report** tab and tap **Simulate MATCH** / **Simulate MISMATCH**

## Tech stack

| Layer | Technology |
|---|---|
| App shell | [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Vision | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe) — Object Detector |
| Speech | Web Speech API / [transformers.js](https://huggingface.co/docs/transformers.js) (Whisper) |
| Acoustic sensing | Web Audio API — tone sweep + FFT analysis |
| Reasoning | [WebLLM](https://webllm.mlc.ai/) — `Qwen2.5-1.5B-Instruct`, on-device via WebGPU |
| Feedback | Vibration API + Web Audio API (synthesized alert/chime tones) |
| Storage | IndexedDB |
| Hosting | Netlify |

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
```

Camera and mic access require a secure context — use the deployed URL above, or `localhost` during local development.

## License & credits

MIT License.

Built with [Vite](https://vitejs.dev/), [MediaPipe](https://ai.google.dev/edge/mediapipe), [WebLLM](https://webllm.mlc.ai/), and [transformers.js](https://huggingface.co/docs/transformers.js). Buttons adapted from a [Uiverse.io](https://uiverse.io/) design by TemRevil.
