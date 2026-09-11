# GroundTruth — Project Dossier for Judges

## 1. The project in one sentence

**GroundTruth is an offline-first progressive web app (PWA) that collects visual, spoken, and acoustic evidence around an LPG-cylinder delivery claim, then presents a cautious Match, Mismatch, or Recheck decision.**

For the current live demo, a **beverage can is deliberately used as a safe physical surrogate**:

- the camera demo distinguishes a **sealed can** from an **unsealed can**;
- the acoustic demo distinguishes a locally calibrated **full can** from an **empty can**.

The product language, workflow, and intended problem space remain LPG delivery verification. The can classifier is a demo aid, **not evidence that the system can certify an LPG cylinder seal or gas level**.

## 2. Short pitch

### 30-second version

GroundTruth tackles a trust problem in LPG delivery: after a cylinder is handed over, it is difficult for a customer to prove whether the right condition was delivered. The app captures three independent signals—an image, a spoken delivery claim, and an acoustic response—and keeps sensitive records on the phone. For the demonstration, we use a beverage can as a safe stand-in: computer vision identifies whether its opening is sealed or open, while an on-device acoustic sweep compares the can with references recorded for known full and known empty states. The system is deliberately conservative: if evidence is unclear, calibration is missing, or scores are too close, it returns **Recheck** rather than pretending certainty.

### 2-minute version

GroundTruth is an evidence-capture and verification prototype for LPG delivery. Its user journey is: capture the container image, record the delivery claim, run an acoustic check, review the evidence, and receive a Match, Mismatch, or Recheck outcome. It is built as a React PWA so it can run from a phone browser and retain data locally.

The project has two technical proof-of-concepts. First, the visual module uses TensorFlow.js MobileNet embeddings and local reference images. For the demo, it has seven sealed-can and six unsealed-can examples. It also has a direct visual opening detector: if a clear dark opening is visible on the lid, it classifies the can as unsealed. Second, the acoustic module plays an audible 3.4-second exponential frequency sweep, samples the microphone response into a compact 32-value ambient-corrected fingerprint, and compares that fingerprint with three known-full and three known-empty local references. It does not save a large raw audio recording as calibration.

The important engineering decision is calibration. Every phone/container setup has its own acoustic behavior, so the user records three labelled references for each state. A normal check cannot replace those references; it only produces a prediction and optional labelled validation history. The app includes export/import and reset controls because browser storage can be cleared.

This is a feasibility prototype, not a safety certification product. The live can demonstration validates the workflow and on-device approach; it does not prove LPG fill-level accuracy. The correct judge-facing position is that GroundTruth reduces ambiguity and guides a recheck, while real LPG deployment would require a much larger validated dataset, controlled tests, hardware/safety review, and human confirmation.

## 3. Problem, users, and intended value

### Problem

LPG deliveries can involve disputes: a customer may be unsure whether the delivered cylinder was full, properly sealed, or consistent with the delivery claim. Existing evidence is often informal, difficult to collect at the moment of delivery, and not organized into one reviewable record.

### Intended users

- LPG customers receiving a cylinder.
- Delivery personnel who need a transparent verification flow.
- Distributors or support teams resolving a dispute.

### Value proposition

GroundTruth does not promise to replace regulated measurement. It creates a guided, privacy-conscious evidence trail and combines multiple signals so a user is not asked to rely only on memory or a single photo.

## 4. What is actually implemented today

| Area | Current implementation | Honest boundary |
| --- | --- | --- |
| Mobile app | React/Vite PWA with phone-first screens, installable manifest, service-worker precaching | It is a browser app, not a native mobile application. |
| Visual demo | Local can-photo references; MobileNet embedding comparison; direct lid-opening heuristic | Only 13 supplied can reference photos. It is not an LPG seal model or a production-grade general vision model. |
| Claim capture | Browser microphone recording UI and an optional local Whisper transcription module | The UI/workflow is implemented; transcription/model download support depends on browser capability and first-use model loading. |
| Acoustic check | Real Web Audio speaker sweep plus microphone FFT capture; fingerprint comparison to saved references | It is an exploratory, device/container-specific prototype. It has no proven field accuracy claim. |
| Calibration | Exactly 3 Full + 3 Empty profiles, IndexedDB/localStorage fallback, reset and JSON export/import | A browser/site-data clear or PWA uninstall can remove local data unless exported. |
| Validation | Each normal acoustic prediction can be marked with the known actual label; accuracy is computed from labelled history | Accuracy must be measured from actual held-out tests. Do not claim 80% without the recorded validation results. |
| Decisioning | Conservative local rules module and optional WebLLM module are present | The current animated AI Analysis screen still routes using its session outcome; end-to-end wiring of `reconcile.js`/`llm.js` into that screen remains future work. |

## 5. End-to-end user flow

```text
Home
  -> Capture Evidence: take a live photo or upload a photo
  -> Record Claim: record a spoken delivery statement
  -> Acoustic Check: play sweep and capture microphone response
  -> Review Evidence: inspect image, claim, and acoustic status
  -> Result: Match / Mismatch / Recheck

Calibration is entered before Acoustic Check:
  Known Full:  record 3 reference sweeps
  Known Empty: record 3 reference sweeps
  Save averaged fingerprints locally
  Later checks compare only against those saved averages
```

There are two terms that judges should not confuse:

- **Sealed / unsealed** is the visual can-lid demonstration.
- **Full / empty** is the acoustic calibration demonstration.

## 6. Architecture

```text
Phone browser / PWA
│
├─ React UI (screens, session state, history presentation)
├─ Browser device APIs
│  ├─ Camera: getUserMedia / image upload
│  ├─ Microphone: getUserMedia + MediaRecorder / Web Audio
│  └─ Audio output: Web Audio oscillator sweep
├─ On-device intelligence
│  ├─ TensorFlow.js + MobileNet V2: can-image embeddings
│  ├─ Lid aperture detector: direct open-can cue
│  ├─ Web Audio FFT: acoustic fingerprint
│  ├─ Transformers.js Whisper adapter: optional transcription
│  └─ WebLLM adapter: optional local reconciliation module
└─ Local persistence
   ├─ IndexedDB: acoustic calibration and validation history
   ├─ localStorage fallback: small calibration prototype data
   └─ JSON export/import: backup and restoration
```

The application does not require an application backend for the core calibration comparison. Its models may need an internet connection on first load before browser caching; therefore it is more accurate to call it **offline-capable after required assets/models are cached**, not universally offline from the first launch.

## 7. Technology stack

| Layer | Technology | Why it is used |
| --- | --- | --- |
| Front end | React 18, TypeScript/TSX | Component-based responsive mobile UI. |
| Build tooling | Vite 5, `@vitejs/plugin-react` | Fast browser development and production bundling. |
| Styling | Tailwind CSS v4, Plus Jakarta Sans, custom CSS | Consistent phone-first interface. |
| PWA | `vite-plugin-pwa`, Web App Manifest, Workbox precache | Installable experience and caching of build assets. |
| Icons/motion | `lucide-react`, `motion` | UI visual language and interactions. |
| Vision | `@tensorflow/tfjs`, `@tensorflow-models/mobilenet` | On-device embedding extraction for reference comparison. |
| Audio signal processing | Browser Web Audio API | Generate sweep, sample FFT spectra, form compact fingerprints. |
| Speech | MediaRecorder; `@huggingface/transformers` adapter for `onnx-community/whisper-tiny.en` | Capture claim audio and support on-device transcription. |
| Optional local LLM | WebLLM loaded at runtime, `Llama-3.2-1B-Instruct-q4f16_1-MLC` | Conservative local evidence reconciliation where WebGPU is available. |
| Storage | IndexedDB with localStorage fallback | Durable local calibration and validation history. |
| QA | Puppeteer Core audit script | Responsive-screen/console/overflow checks. |
| Hosting | GitHub repository + Vercel deployment | Static PWA hosting over HTTPS. |

Packages such as COCO-SSD, KNN classifier, and Google GenAI are present in `package.json` or playground experiments, but the current can-lid production path is the MobileNet/reference method in `src/vision.js`; they should not be described as the active classification method.

## 8. Visual method: sealed versus unsealed can demo

### Reference data

The project bundles 13 user-provided can-lid images:

- 7 sealed examples in `public/can-seal-references/sealed/`
- 6 unsealed examples in `public/can-seal-references/unsealed/`

These are a small reference set, not a trained dataset split into training/validation/test sets.

### Inference steps

1. A user captures a live camera frame or supplies an image.
2. TensorFlow.js loads MobileNet V2 with alpha 0.5 and extracts a visual embedding from every reference and the current image.
3. The app averages embeddings per class to make a sealed centroid and an unsealed centroid.
4. It calculates cosine similarity to both centroids.
5. Before relying on global similarity, it checks the upper-middle lid crop for a large connected dark region. A clear dark aperture is strong visual evidence that the can is open.
6. If the opening test is clear, the result is **unsealed**. Otherwise, the closest embedding centroid wins. If the similarity margin is too small, the result is **can seal unclear**.

### Why use the opening override?

The object and background can vary heavily—brand, colour, table, hand, angle, light—while the physical opening on the lid is the most relevant cue. A direct dark-aperture check makes the demo more robust when the opening is clearly visible. It is still not infallible: shadows, poor framing, a dark background, glare, or a partially visible lid can cause failure. The UI must therefore encourage a close, top-down photo with the lid centred.

### Judge-safe claim

Say: “For the demo, the visual module recognizes a visibly sealed or opened beverage-can lid using local references and an aperture cue.”

Do **not** say: “It can certify an LPG safety seal,” “it is trained on LPG cylinders,” or “it has production accuracy.”

## 9. Acoustic method: calibrated full versus empty demo

### Why calibration is necessary

Acoustic response depends on the phone speaker/microphone, volume, case, distance, orientation, can/container shape, room reflections, and background noise. A universal fixed threshold would be unreliable. GroundTruth instead learns a small reference profile **on the same phone and physical setup**.

### Calibration protocol

1. Open **Calibration**.
2. Select **Known Full**, keep the phone in the same position near the container, and tap Record reference three times.
3. Select **Known Empty** and repeat three times.
4. The app stores six small 32-value frequency profiles with class labels, date, and optional phone/container notes.
5. It averages the three Full and three Empty profiles independently.
6. A normal check only compares to those averages. It never overwrites calibration.

The implementation requires `REQUIRED_SAMPLES = 3` for each class. Its current fingerprint format is **version 4**. References made with earlier fingerprint versions are intentionally treated as incompatible and must be recalibrated, preventing comparison of mismatched signal-processing schemes.

### Signal generation and capture

The current sweep configuration is:

- start frequency: 100 Hz
- end frequency: 8000 Hz
- exponential sweep duration: 3.4 seconds
- oscillator gain: ramped in and out to reduce clicks
- FFT size: 2048
- profile length: 32 ambient-corrected frequency bands
- microphone constraints request disabled echo cancellation, noise suppression, and automatic gain control where the browser permits it

For an exponential sweep, expected frequency at time `t` is:

`f(t) = f_start × (f_end / f_start)^(t / T)`

The app captures a short ambient baseline before the sweep, averages the entire microphone spectrum during the known sweep into 32 bands, and subtracts the ambient baseline. This follows the broad-spectrum approach used by the original acoustic playground and is more tolerant of analyser timing and phone DSP than pairing a fast chirp to one narrow FFT band per animation frame.

### Fingerprint and comparison

For each band energy `E_i`, the app:

1. computes `log(1 + E_i)`;
2. subtracts the profile mean, removing global loudness bias;
3. L2-normalizes the vector.

This yields a shape-based fingerprint rather than a raw volume score. It stores the fingerprint—not a large calibration audio file.

Similarity uses cosine similarity:

`similarity(a,b) = (a · b) / (||a|| ||b||)`

For a live profile, the app computes:

- `scoreFull`: similarity to the averaged Full fingerprint
- `scoreEmpty`: similarity to the averaged Empty fingerprint
- `gap = |scoreFull - scoreEmpty|`

The higher score is the predicted state only if the gap is at least `0.025` (2.5 percentage points after display conversion). Otherwise GroundTruth returns **Recheck**. The UI displays both similarities and the gap so the decision is inspectable rather than a black box.

### Validation history is separate from calibration

After a check, the user may enter the known actual state. The app stores that as validation history and can calculate accuracy from labelled checks. It does not add that live check to Full/Empty calibration and does not change the averages.

### Important outcome statement

The acoustic component is a **research prototype for relative container-state classification after local calibration**. It has not established a general full/empty accuracy rate, and it must not be used as a safety or billing measurement for LPG. A scale, regulator-approved procedure, and human inspection remain authoritative.

## 10. Privacy, local storage, and backup

- Acoustic reference profiles and validation history are held locally in IndexedDB database `groundtruth-acoustic`, with a localStorage fallback for a small prototype.
- The calibration feature stores compact numeric fingerprints, labels, timestamps, and notes—not the original calibration audio waveform.
- Export produces a JSON calibration backup; import restores compatible calibration data.
- Reset removes local calibration only when the user explicitly chooses it.
- Browser site-data clearing, PWA uninstall, browser-profile reset, or switching device can remove local data; backup/export is therefore part of the workflow.
- Captured photo/audio handling is browser/session dependent. The current implementation should not be described as end-to-end encrypted cloud storage because it does not provide a cloud evidence vault.

## 11. Decisioning and feedback

`src/reconcile.js` contains deterministic, conservative fallback logic:

- missing photo or claim → **INCOMPLETE**
- unreliable visual result or incomplete/uncalibrated acoustic evidence → **RECHECK**
- acoustic conflict with the claim → **MISMATCH**
- all required signals recorded and calibrated acoustic response supports the claim → **MATCH**

`src/llm.js` provides an optional WebGPU/WebLLM module using Llama 3.2 1B for a short conservative explanation. Its system prompt specifically says a general object detector does not certify an LPG cylinder or seal and uncalibrated acoustics do not prove fill.

The current UI’s `AnalysisScreen.tsx` is still a progress/route prototype that chooses its result from session state; it does not yet invoke either reconciliation module end to end. State this plainly if asked.

The app also includes tactile/audio feedback (`src/feedback.js`) such as short vibrations, screen flash, and tones for match/mismatch feedback where the device supports those browser APIs.

## 12. Deployment and phone-camera lessons

The project is built with `npm run build`, can be run locally with `npm run dev`, and is deployed as a static Vercel site from the GitHub `main` branch.

Camera and microphone access require a secure browser context:

- `localhost` is treated specially as secure for development;
- a phone opening a local `http://192.168.x.x:port` Wi-Fi URL may not be allowed to use camera/microphone;
- the deployed HTTPS Vercel URL is the appropriate way to test phone permissions.

If a phone shows an old screen after a deployment, common causes are a service-worker/cache refresh delay, an old/stale Vercel URL, or cached browser assets. Test the correct production URL in an incognito tab or clear the site cache when validating a deployment.

## 13. Development journey and key design choices

1. The project started as a visual delivery-verification interface with simulated acoustic displays.
2. Real browser camera capture and image upload were added, while retaining the LPG-oriented UI.
3. To make a safe live demo possible without an LPG cylinder, the user supplied sealed and unsealed can photos. These became bundled visual references; no LPG branding/graphics were intentionally changed.
4. A local reference-based MobileNet vision pipeline and a direct can-opening heuristic were introduced.
5. The acoustic screen was upgraded from average-energy simulation to a real speaker sweep, microphone FFT profile, calibrated local comparison, validation history, and backup/restore.
6. Early calibration fingerprints used earlier formats. The current version-3 pipeline extends the sweep and corrects FFT analyser latency, so old versioned calibration is deliberately invalidated rather than silently reused.
7. The project was built and deployed to HTTPS hosting to make phone camera testing possible.

The main design pattern throughout is **conservative abstention**: missing calibration, visually unclear frames, or similar class scores should produce Recheck—not false confidence.

## 14. Current limitations and risks

These are strengths to acknowledge in a judge conversation because they show engineering maturity.

1. **Small visual dataset.** Thirteen reference images are insufficient for robust generalisation across every can, lighting condition, angle, or occlusion.
2. **No LPG visual dataset.** The visual demo is about can lids, not LPG seals.
3. **Acoustic transferability is unknown.** It is specific to one device/container/environment calibration and must be validated with controlled, held-out trials.
4. **No verified accuracy metric yet.** “80%” was an informal demo observation, not a documented benchmark. Report accuracy only after labelled validation runs.
5. **Phone hardware variability.** Different speakers and microphones, automatic DSP, cases, battery settings, and volume can change fingerprints.
6. **Environmental sensitivity.** Room echo, handling noise, background sound, and changed positioning affect audio capture.
7. **Browser permissions and HTTPS.** Camera/microphone APIs depend on user permission and secure context.
8. **First-use model availability.** MobileNet/Whisper/WebLLM assets may be downloaded on first use; a fully offline first launch is not guaranteed.
9. **Analysis wiring is incomplete.** The LLM/local reconciliation modules are present but the displayed AI Analysis path is not yet driven by them.
10. **No regulated safety validation.** The prototype must not make safety, financial, or legal decisions by itself.

## 15. Evaluation plan before making accuracy claims

### Visual evaluation

Collect a larger labelled set with unseen cans, top-down and angled views, different lights, reflections, hands/backgrounds, partially occluded lids, and both sealed/unsealed states. Keep a held-out test set that was never used as a reference. Measure confusion matrix, precision, recall, F1, and false-open/false-sealed rates.

### Acoustic evaluation

For each target can/container and device configuration:

1. Create the six calibration recordings.
2. Record at least 10–20 subsequent labelled trials per class at fixed placement.
3. Repeat across rooms, distances, volumes, and phone models.
4. Report confusion matrix, accuracy, false-full and false-empty rates, Recheck rate, and confidence-gap distribution.
5. Freeze calibration before evaluation; do not use test trials to update references.

The first success criterion should not simply be “highest accuracy.” It should also be a low rate of dangerous confident errors and an appropriate Recheck rate for ambiguous samples.

## 16. Suggested live demo script

1. “GroundTruth is an LPG-delivery evidence prototype; for safety and availability, I am demonstrating the sensing flow with a beverage can.”
2. Open Capture Evidence and show a top-down sealed/unsealed can lid. Explain that the screen gives a local reference comparison, and that an open aperture is the strongest cue.
3. Record a short delivery claim.
4. Open Calibration. Explain the need for three known-full and three known-empty recordings on the same phone/setup. Show the saved counters, notes, and export option.
5. Run Acoustic Check. Keep the phone placement and volume consistent. Let the 3.4-second audible sweep finish.
6. Point out the two similarity scores and their gap. Explain that a small gap produces Recheck.
7. Mark the actual known state only for validation, explaining it changes history/accuracy—not calibration.
8. Conclude: “This is designed to make evidence collection and ambiguity visible. In a real LPG deployment, measurement and safety approval would remain with validated procedures and human inspection.”

## 17. Likely judge questions and accurate answers

### Why not just use a weighing scale?

A scale is the correct authority for a regulated fill measurement. GroundTruth is exploring a low-friction evidence workflow that can capture multiple signals at delivery time. It is not presented as a replacement for a certified scale.

### Is this really AI?

The visual module uses a pretrained MobileNet neural model to generate image embeddings, then performs local similarity classification against reference centroids. The optional reconciliation module uses a small on-device LLM. The acoustic classifier is signal processing plus cosine-similarity comparison, not a deep neural network. Calling every component “AI” would be imprecise.

### Why only three calibration samples per class?

Three is a deliberate minimal prototype requirement that makes a demonstration practical while reducing the influence of one noisy reading. It is not statistically sufficient for production validation; future versions should support more samples and quality checks.

### Why does the app have a Recheck result?

Because a responsible classifier should abstain when evidence is weak. Recheck is triggered by missing calibration, visually unclear input, incomplete capture, or too-small similarity gap. It reduces the risk of presenting false certainty.

### Why are you using a can if the product is about LPG?

An LPG cylinder was not available for safe repeatable testing. The can is a physical surrogate to demonstrate the interaction, local calibration architecture, and visual open/closed distinction. We explicitly do not claim the can results transfer to LPG without dedicated data and validation.

### Is the app fully offline?

Core calibration comparison and local storage run in the browser. The PWA caches build assets, but some ML models can need a first internet download before they are cached. So it is offline-capable after caching, not guaranteed offline on the first launch.

### What exactly is stored?

For calibration, the app stores compact numeric frequency fingerprints, labels, timestamps, notes, and averages—not a large raw calibration recording. It also stores separate validation history. The user can export/import calibration JSON.

### Why did old calibration disappear after an update?

The fingerprint algorithm changed to version 4 to use an ambient-corrected broad-spectrum profile that is more tolerant of phone timing and DSP. Old vector formats are not comparable, so the app intentionally requires fresh references instead of producing misleading results from incompatible data.

### How do you prevent a normal test from corrupting calibration?

Only the Calibration screen calls the operation that adds a reference. Normal checks are stored as validation/history entries; optional actual labels update only those records, never the class averages.

### What happens if the app predicts the wrong state with high confidence?

That is evidence the prototype needs more validation or the setup changed. The user should mark the known actual state, inspect the history, keep calibration frozen, and rerun controlled tests. The product should not be used to make a safety or billing decision.

## 18. Roadmap

1. Finish wiring the real reconciliation modules into the AI Analysis screen and result screens.
2. Add calibration quality gates: signal level, ambient-noise estimate, placement guide, repeatability/outlier warnings, and more than three samples where needed.
3. Build a consented, labelled, diverse dataset and establish held-out evaluation.
4. Train/validate a task-specific visual model only after acquiring legitimate LPG seal examples and expert labels.
5. Evaluate acoustic sensing in controlled laboratories against trusted ground truth (for example, measured mass), across device models and environments.
6. Add a secure opt-in evidence export/audit trail if a real distribution workflow requires it.
7. Complete privacy, security, regulatory, and safety review before any real LPG deployment.

## 19. Key source map

| File | Responsibility |
| --- | --- |
| `src/acoustic.js` | Sweep generation, FFT band capture, fingerprint construction, cosine similarity. |
| `src/acoustic-store.js` | Calibration persistence, versioning, averages, classification, validation history, JSON backup. |
| `src/vision.js` | MobileNet reference embeddings and can-lid opening detector. |
| `src/speech.js` | Browser audio decoding and Whisper adapter. |
| `src/reconcile.js` | Deterministic conservative decision fallback. |
| `src/llm.js` | Optional on-device WebLLM reconciliation adapter. |
| `src/feedback.js` | Vibration, tones, and visual feedback helpers. |
| `src/ui/screens/CalibrationScreen.tsx` | Calibration, sample counters, reset, export/import UI. |
| `src/ui/screens/AcousticCheckScreen.tsx` | Live sweep UI, result scores, actual-label validation UI. |
| `src/ui/screens/CaptureEvidenceScreen.tsx` | Camera/image capture and visual analysis UI. |
| `src/ui/screens/RecordClaimScreen.tsx` | Delivery-claim recording UI. |
| `src/ui/screens/ReviewEvidenceScreen.tsx` | Evidence review UI. |
| `src/ui/screens/AnalysisScreen.tsx` | Presentational AI analysis/progress route; not yet module-wired. |
| `vite.config.js` | Vite, React, Tailwind, PWA manifest/workbox configuration. |
| `package.json` | Scripts and dependency inventory. |
| `scripts/audit-screens.cjs` | Puppeteer UI audit script. |

## 20. Final one-line position

**GroundTruth demonstrates a privacy-conscious, on-device, multi-signal evidence workflow with conservative recheck behavior; its can-based visual and acoustic components are promising prototypes to be rigorously validated before any LPG or safety-critical use.**
