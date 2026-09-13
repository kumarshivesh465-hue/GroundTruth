export type AppScreen = 
  | 'home'
  | 'capture'
  | 'record-claim'
  | 'acoustic-check'
  | 'calibration'
  | 'tap-check'
  | 'tap-calibration'
  | 'dataset-capture'
  | 'review-evidence'
  | 'ai-analysis'
  | 'result-match'
  | 'result-mismatch'
  | 'result-clarity'
  | 'vessel-trend'
  | 'history';

export type VerificationOutcome = 'match' | 'mismatch' | 'clarity';

export interface CylinderPreset {
  id: string;
  name: string;
  brand: string;
  capacity: string;
  tareWeight: string;
  mfgDate: string;
  testDate: string;
  imageUrl: string;
  simulatedOutcome: VerificationOutcome;
  detectedBrand: string;
  expectedBrand: string;
  resonanceScore: number;
  sealIntact: boolean;
  unclearReason?: string;
}

export interface VerificationSignal {
  id: string;
  name: string;
  status: 'success' | 'unclear' | 'mismatch';
  timestamp: string;
}

export interface HistoryRecord {
  id: string;
  recordId: string;
  customerName: string;
  cylinderId: string;
  category: 'DOMESTIC 14.2KG' | 'INDUSTRIAL 19KG' | 'COMMERCIAL 5KG';
  status: 'match' | 'mismatch' | 'incomplete';
  date: string;
  time: string;
  address?: string;
  signals: string[];
  digitalReceiptId?: string;
  aiConfidence?: number;
  conflicts?: {
    visual: { detected: string; expected: string; match: boolean };
    acoustic: { detected: string; expected: string; match: boolean };
    seal: { detected: string; expected: string; match: boolean };
  };
}

export interface VisionEvidence {
  label: string | null;
  confidence: number;
  inferenceMs: number;
  status: 'detected' | 'unclear';
  imageDataUrl: string;
}

export interface ReconciliationResult {
  status: 'MATCH' | 'MISMATCH' | 'RECHECK' | 'INCOMPLETE';
  reason: string;
  source: string;
}

/**
 * The acoustic estimate is only ever an interpolation between the two local
 * calibration anchors (one known Full, one known Empty). It is not a weight,
 * a certified volume, or a precise measurement.
 */
export interface AcousticEvidence {
  /** Estimated fill level, integer 0-100. Null when guardrails withheld it. */
  fillPercentage: number | null;
  /** Name of the method that produced the estimate, or null when withheld. */
  fillEstimateMethod: string | null;
  /** Why no estimate was shown, when fillPercentage is null. */
  withheldReason: string | null;
  fullSimilarity: number;
  emptySimilarity: number;
  gap: number;
  prediction: 'full' | 'empty' | 'recheck';
  calibrated: boolean;
  calibrationMessage: string;
}

/** Distributors the user can explicitly pick. The app never guesses one. */
export type ProviderId = 'bharatgas' | 'indane' | 'hpgas' | 'other';

export interface ProviderSelection {
  id: ProviderId;
  /** Free-text label, only used when id is 'other'. */
  otherLabel: string;
  /** Always starts blank. The app never invents a company address. */
  recipientEmail: string;
}

/** Result of one tap check, carried into reconciliation as screening evidence. */
export interface TapEvidence {
  prediction: 'level' | 'recheck';
  levelId: string | null;
  levelName: string | null;
  /** Nearest calibrated level's nominal fill, 0-100. Null when no level was decided. */
  estimatePercent: number | null;
  /** Separation margin over the runner-up, as a ratio. Higher is more confident. */
  confidence: number | null;
  message: string;
  capturedAt: string;
  vesselId: string | null;
}

/** Output shape of consumption.predictTimeToEmpty, kept loose for UI use. */
export interface ConsumptionPrediction {
  status: 'ok' | 'stable' | 'empty' | 'insufficient';
  reason?: string;
  ratePerDay?: number;
  daysToEmpty?: number;
  earliestDays?: number;
  latestDays?: number;
  margin95?: number;
  r2?: number;
  count?: number;
  spanDays?: number;
  weakFit?: boolean;
  refillsDetected?: boolean;
  readingsNeeded?: number;
}

/** Result of the contamination / damage shape screen. */
export interface ShapeDriftResult {
  status: 'stable' | 'drift' | 'baseline-pending';
  reason: string;
  similarity?: number;
  threshold?: number;
  compared?: number;
}
export interface VerificationSession {
  selectedPreset: CylinderPreset;
  capturedImage: string | null;
  visionEvidence: VisionEvidence | null;
  audioDurationSeconds: number;
  hasRecordedAudio: boolean;
  /** The original worker recording. This remains the source of truth for a claim. */
  audioBlob: Blob | null;
  /** Object URL created locally from audioBlob; never an uploaded URL. */
  audioUrl: string | null;
  audioMimeType: string | null;
  /** Down-sampled measured amplitudes used for the local waveform preview. */
  audioWaveform: number[];
  audioCapturedAt: string | null;
  transcript: string | null;
  transcriptionState: 'idle' | 'loading-model' | 'transcribing' | 'complete' | 'error';
  transcriptionError: string | null;
  acousticSignalQuality: number;
  ambientNoiseDb: number;
  resonanceStatus: 'Stable' | 'Calibrating' | 'Unstable';
  acousticPrediction?: 'full' | 'empty' | 'recheck';
  acousticConfidence?: number;
  /** Estimated fill level plus its provenance and guardrail state. */
  acousticEvidence?: AcousticEvidence | null;
  /** Live tap-screening evidence from the primary method. */
  tapEvidence?: TapEvidence | null;
  reconciliation?: ReconciliationResult;
  outcome: VerificationOutcome;
  customerName: string;
  cylinderUid: string;
  digitalReceiptId: string;
  timestamp: string;
  /** The physical vessel this session is about, used to key its own history. */
  vesselId: string;
  /** Explicit provider selection for the drafted report email. */
  provider?: ProviderSelection;
}
