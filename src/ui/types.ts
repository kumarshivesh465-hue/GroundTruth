export type AppScreen = 
  | 'home'
  | 'capture'
  | 'record-claim'
  | 'acoustic-check'
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

export interface VerificationSession {
  selectedPreset: CylinderPreset;
  capturedImage: string | null;
  audioDurationSeconds: number;
  hasRecordedAudio: boolean;
  acousticSignalQuality: number;
  ambientNoiseDb: number;
  resonanceStatus: 'Stable' | 'Calibrating' | 'Unstable';
  outcome: VerificationOutcome;
  customerName: string;
  cylinderUid: string;
  digitalReceiptId: string;
  timestamp: string;
}
