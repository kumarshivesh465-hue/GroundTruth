export type AppScreen = 
  | 'home'
  | 'capture'
  | 'record-claim'
  | 'acoustic-check'
  | 'calibration'
  | 'review-evidence'
  | 'ai-analysis'
  | 'result-match'
  | 'result-mismatch'
  | 'result-clarity'
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
  reconciliation?: ReconciliationResult;
  outcome: VerificationOutcome;
  customerName: string;
  cylinderUid: string;
  digitalReceiptId: string;
  timestamp: string;
}
