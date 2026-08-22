# GroundTruth \u2014 Starter Skeleton (PRE-EVENT USE ONLY)

## \u26a0\ufe0f Read this first

This is a **navigation shell + environment check**, not the app. It exists so your team can:

1. Confirm Node/Vite/the PWA toolchain actually works on your laptops
2. Confirm camera access, service worker install, and offline reload work on the **actual iQOO loaner phone**
3. Learn the WebLLM and MediaPipe APIs once, via the `playground/` scripts, before the clock starts

**Per the hackathon build rules, do not write GroundTruth's real application logic in this repo before the event.** The `TODO (event day)` comments mark exactly where that logic goes. Treat this folder as a personal sandbox to delete/reset once the event begins \u2014 your submitted repo should be built fresh during the 30-hour window (you can still use this as a mental map, just don't carry the file history in as-is).

---

## Setup

```bash
npm install
npm run dev
```

This starts Vite at `http://localhost:5173` by default. Open it in Chrome on your laptop first to confirm the shell renders and the Home/Capture/Claim/Reconcile/Report tabs switch.

## Testing camera access on the phone

`getUserMedia` (camera/mic) requires a **secure context** \u2014 `https://` or `localhost`. A plain `http://<laptop-lan-ip>:5173` on the phone will be blocked. Two good options:

**Option A \u2014 Chrome DevTools port forwarding (recommended for dev):**
1. Connect the phone to the laptop via USB (or use Office Kit's bridge)
2. On the laptop, open `chrome://inspect#devices`
3. Under "Port forwarding", map device port `5173` \u2192 `localhost:5173`
4. On the phone, open `http://localhost:5173` in Chrome \u2014 it's treated as secure

**Option B \u2014 deploy to Vercel/Netlify:**
Push to a free static host to get a real `https://` URL, then open that on the phone. Slower to iterate, but closer to your final demo setup.

## Learning the AI libraries before the event

Open these two files through the dev server (not by double-clicking, so ES module imports work):

- `http://localhost:5173/playground/webllm-test.html` \u2014 loads a small model fully in-browser and runs one test prompt. First load downloads the model (~1GB); after that it's cached and offline.
- `http://localhost:5173/playground/mediapipe-test.html` \u2014 opens the camera and draws live object-detection boxes so you can see detection quality/lighting before the real build.

Run both **on the actual iQOO phone** at least once before the event \u2014 that's the only way to know if WebGPU/model loading actually behaves the way you expect on that hardware.

## What's already wired up

- Vite + `vite-plugin-pwa` \u2014 installable, offline-capable app shell
- 5-screen navigation (Home / Capture / Claim / Reconcile / Report)
- Working camera preview on the Capture screen
- Online/offline status indicator in the header

## What's intentionally NOT built (build this during the event)

- MediaPipe object detection wired into the Capture screen
- Speech-to-text wired into the Claim screen
- WebLLM reconciliation wired into the Reconcile screen
- Report rendering + IndexedDB history

See `PRD.md` (or the full PRD doc shared separately) for the exact architecture, model choices, and 30-hour build plan.
