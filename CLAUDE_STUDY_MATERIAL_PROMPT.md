# Prompt for Claude: create my GroundTruth judge study material

Copy the prompt below into Claude in the project folder, or upload the listed files with it.

---

You are a rigorous technical interview coach and project-study-material writer. Create a complete, judge-ready study pack for my project, **GroundTruth**.

First read these project files carefully:

1. `PROJECT_DOSSIER_FOR_JUDGES.md` — high-level project history, current state, constraints, and claim boundaries.
2. `README.md`
3. `package.json`
4. `vite.config.js`
5. `src/acoustic.js`
6. `src/acoustic-store.js`
7. `src/vision.js`
8. `src/speech.js`
9. `src/reconcile.js`
10. `src/llm.js`
11. `src/feedback.js`
12. `src/ui/screens/CalibrationScreen.tsx`
13. `src/ui/screens/AcousticCheckScreen.tsx`
14. `src/ui/screens/CaptureEvidenceScreen.tsx`
15. `src/ui/screens/RecordClaimScreen.tsx`
16. `src/ui/screens/ReviewEvidenceScreen.tsx`
17. `src/ui/screens/AnalysisScreen.tsx`
18. `src/ui/App.tsx`
19. `scripts/audit-screens.cjs`

If the dossier and source code conflict, **trust the source code** and explicitly mention the discrepancy. Do not inspect or rely on generated build artifacts or `node_modules`.

## Critical truth rules

- GroundTruth is intended as an LPG-delivery evidence and verification prototype.
- The current live demo uses a **beverage can as a safe surrogate**. The camera demo is sealed-can versus unsealed-can. The acoustic demo is locally calibrated full-can versus empty-can.
- Never imply that the can demo proves LPG seal detection, LPG fill measurement, safety certification, or regulatory compliance.
- The visual references are small: 7 sealed-can photos and 6 unsealed-can photos. Do not call this a production dataset or a trained LPG model.
- The acoustic method is a local, device/container/setup-specific prototype. Do not invent accuracy, precision, recall, or an “80% result.” If no documented held-out metrics exist, say that accuracy is not yet established.
- Explain that `FINGERPRINT_VERSION = 5` requires fresh calibration when old reference profiles use an incompatible version.
- Explain that core comparison and storage are local, but model assets may require a first internet download before being cached. Do not claim that first launch is fully offline.
- The modules `reconcile.js` and `llm.js` exist, but verify whether `AnalysisScreen.tsx` invokes them. If it does not, say the analysis screen is currently presentational/session-routed rather than end-to-end wired.
- Separate “implemented now,” “demo-only/prototype,” and “future work” in every major section.
- Keep answers honest, clear, and confident. Never hide limitations.

## Produce one Markdown file named `JUDGE_STUDY_MATERIAL.md` with these sections

1. **One-page project summary** for last-minute revision.
2. **30-second, 60-second, and 2-minute pitch** in natural spoken language.
3. **Problem, user, and impact**: why this matters, who uses it, what it does and does not solve.
4. **Architecture explanation**: a compact ASCII diagram and a step-by-step data flow.
5. **Technology stack table**: every active technology, model, library, browser API, and its reason for use. Clearly label inactive/playground-only packages if relevant.
6. **Visual-method study notes**: MobileNet embeddings, class centroids, cosine similarity, lid-opening heuristic, local references, confidence, common failure cases.
7. **Acoustic-method study notes**: calibration, exponential sweep equation, 100–8000 Hz, 1.2-second duration, FFT size 2048, 32 whole-spectrum bins, original broad-spectrum averaging, cosine comparison, closest-reference prediction, Full/Empty/Recheck behavior, and why raw calibration audio is not stored.
8. **Storage, privacy, PWA, and deployment**: IndexedDB/localStorage fallback, export/import, service worker, HTTPS permission requirement, first-use model downloading/caching.
9. **Exact user demo script**: what to tap, what to say to judges, and how to explain an unexpected Recheck or wrong result without bluffing.
10. **Testing and validation plan**: how to get real accuracy; held-out visual data, frozen calibration, confusion matrix, precision/recall/F1, acoustic repeatability, false-positive/false-negative and Recheck rate.
11. **Limitations, risks, ethics, and safety boundaries**: explicit and judge-friendly.
12. **At least 30 judge questions with model answers**. Include difficult questions such as:
    - Why can instead of LPG?
    - Is it AI or signal processing?
    - Why three references?
    - Why cosine similarity?
    - Why does audio calibration change by phone/environment?
    - How do you prevent calibration contamination?
    - What happens when it is wrong?
    - What is truly offline?
    - How is privacy protected?
    - Why not use a certified weighing scale?
    - What does “confidence” actually mean here?
    - What would be required for production deployment?
13. **Flashcards**: 40 short question/answer cards for practice.
14. **Glossary**: simple definitions of every technical term a judge might ask about.
15. **Final honesty checklist**: statements I may safely say, statements I must not say, and corrections for common overclaims.

Use simple language for non-technical judges, but include enough technical depth to answer technical judges. Be specific about exact source-file evidence when helpful. Do not write application code and do not change the project—only generate the study material file.

---
