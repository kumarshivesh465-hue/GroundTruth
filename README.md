# GroundTruth

**Say what happened. The phone checks if it's true.**

GroundTruth is an offline-first Progressive Web App that independently verifies field-delivery claims — catching LPG cylinder under-filling and tampering in seconds, entirely on the phone, with zero connectivity required.

🔗 **Live demo:** [zesty-elf-f9f17e.netlify.app](https://6a89e05ae350dfd664c35636--zesty-elf-f9f17e.netlify.app/)

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

## Tech stack

| Layer | Technology |
|---|---|
| App shell | [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Vision | [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe) — Object Detector |
| Speech | Web Speech API / [transformers.js](https://huggingface.co/docs/transformers.js) (Whisper) |
| Acoustic sensing | Web Audio API — tone sweep + FFT analysis |
| Reasoning | [WebLLM](https://webllm.mlc.ai/) — `Qwen2.5-1.5B-Instruct`, on-device via WebGPU |
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

Built with [Vite](https://vitejs.dev/), [MediaPipe](https://ai.google.dev/edge/mediapipe), [WebLLM](https://webllm.mlc.ai/), and [transformers.js](https://huggingface.co/docs/transformers.js).
