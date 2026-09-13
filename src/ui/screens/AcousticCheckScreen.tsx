import React, { useEffect, useState } from 'react';
import { AcousticEvidence, AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { StepProgress } from '../components/StepProgress';
import { AlertTriangle, ArrowRight, CheckCircle2, Hammer, Info, Mic, Settings2, Volume2, Waves } from 'lucide-react';
import { captureAcousticResponse } from '../../acoustic.js';
import { calibrationQuality, classifyFingerprint, getCalibration, guardAcousticEstimate, hasRequiredSamples, isCalibrated, saveAcousticTest, setActualLabel } from '../../acoustic-store.js';

interface AcousticCheckScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  session: VerificationSession;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

type TestResult = {
  id: string;
  prediction: 'full' | 'empty' | 'recheck';
  fullSimilarity: number;
  emptySimilarity: number;
  gap: number;
  confidence: number;
  fillPercentage: number | null;
  fillEstimateMethod: string | null;
  withheldReason: string | null;
  actualLabel?: 'full' | 'empty' | null;
};

export const AcousticCheckScreen: React.FC<AcousticCheckScreenProps> = ({ onNavigate, onOpenNotifications, setSession }) => {
  const [calibration, setCalibration] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('Checking calibration...');
  const [error, setError] = useState('');
  const [energy, setEnergy] = useState<number | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);

  const loadCalibration = async () => {
    const saved = await getCalibration();
    setCalibration(saved);
    setStatus(isCalibrated(saved) ? 'Ready. Keep the phone in the calibrated position and start the sweep.' : hasRequiredSamples(saved) ? calibrationQuality(saved).message : 'Not calibrated. Save 3 Full and 3 Empty references before a live check.');
  };
  useEffect(() => { void loadCalibration(); }, []);

  const runCheck = async () => {
    if (!isCalibrated(calibration || { fullSamples: [], emptySamples: [] })) { onNavigate('calibration'); return; }
    setIsCapturing(true); setError(''); setResult(null);
    try {
      const response = await captureAcousticResponse(setStatus);
      setEnergy(response.averageEnergy);
      const quality = calibrationQuality(calibration);
      const comparison = guardAcousticEstimate(classifyFingerprint(response.fingerprint, calibration), response.averageEnergy);
      const saved = await saveAcousticTest(comparison);
      const testResult = { ...comparison, id: saved.id } as TestResult;
      setResult(testResult);

      const evidence: AcousticEvidence = {
        fillPercentage: comparison.fillPercentage,
        fillEstimateMethod: comparison.fillEstimateMethod,
        withheldReason: comparison.withheldReason,
        fullSimilarity: comparison.fullSimilarity,
        emptySimilarity: comparison.emptySimilarity,
        gap: comparison.gap,
        prediction: comparison.prediction,
        calibrated: quality.ready,
        calibrationMessage: quality.message,
      };

      const predictionName = comparison.prediction === 'recheck' ? 'Recheck' : comparison.prediction.toUpperCase();
      setStatus(comparison.fillPercentage === null
        ? `${predictionName} result saved locally. No fill estimate was shown, so nothing was compared against the claim.`
        : `Estimated fill level ${comparison.fillPercentage}% saved locally. The reference fingerprints were not changed.`);
      setSession((previous) => ({ ...previous, acousticSignalQuality: comparison.confidence, ambientNoiseDb: response.averageEnergy, resonanceStatus: comparison.prediction === 'recheck' ? 'Unstable' : 'Stable', acousticPrediction: comparison.prediction, acousticConfidence: comparison.confidence, acousticEvidence: evidence }));
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'The acoustic sweep could not be completed.');
      setStatus('Allow microphone access and try again in a quieter environment.');
    } finally { setIsCapturing(false); }
  };

  const labelActualState = async (actualLabel: 'full' | 'empty') => {
    if (!result) return;
    try {
      await setActualLabel(result.id, actualLabel);
      setResult({ ...result, actualLabel });
      setStatus(`Actual state saved as ${actualLabel.toUpperCase()}. Validation history was updated; calibration was not changed.`);
    } catch (labelError) { setError(labelError instanceof Error ? labelError.message : 'Could not save the validation label.'); }
  };

  const calibrated = isCalibrated(calibration || { fullSamples: [], emptySamples: [] });
  const directionLabel = result?.prediction === 'full' ? 'Closer to FULL' : result?.prediction === 'empty' ? 'Closer to EMPTY' : 'Unclear';
  const estimateWithheld = Boolean(result) && result!.fillPercentage === null;
  const resultTone = estimateWithheld || result?.prediction === 'recheck' ? 'amber' : result?.prediction === 'full' ? 'emerald' : 'sky';

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar title="Acoustic Check" showBack onBack={() => onNavigate('record-claim')} showBell hasUnreadNotifications onBellClick={onOpenNotifications} rightAction={<button id="open-calibration-btn" onClick={() => onNavigate('calibration')} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label="Open acoustic calibration"><Settings2 className="w-5 h-5" /></button>} />
      <StepProgress currentStep={3} totalSteps={4} stepLabel="Acoustic Signal" isBadge />
      <div className="flex-1 px-5 py-3 space-y-3.5 overflow-y-auto flex flex-col">
        <div className="relative w-full h-40 rounded-2xl bg-gradient-to-br from-[#93A5B8] via-[#B4C5D4] to-[#C9D9E5] overflow-hidden flex flex-col items-center justify-center p-3 shadow-inner">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className={`w-36 h-36 rounded-full border border-cyan-400/40 ${isCapturing ? 'animate-ping' : ''}`} style={{ animationDuration: '2.5s' }} /><div className={`absolute w-24 h-24 rounded-full border-2 border-cyan-300/50 ${isCapturing ? 'animate-pulse' : ''}`} /></div>
          <div className="relative z-10 flex flex-col items-center"><div className="w-14 h-14 rounded-full bg-[#00A3B4] border-2 border-white/80 shadow-md flex items-center justify-center text-white">{isCapturing ? <Waves className="w-7 h-7" /> : <Mic className="w-7 h-7 stroke-[2.2]" />}</div><span className="mt-2 text-xs font-extrabold tracking-widest text-slate-800 uppercase font-mono">{isCapturing ? 'LISTENING...' : calibrated ? 'READY' : 'SETUP REQUIRED'}</span><span className="text-[9px] tracking-wider text-slate-700 font-mono font-semibold">SPEAKER TONE SWEEP - MICROPHONE RESPONSE</span></div>
        </div>

        <div className="space-y-1"><h2 className="text-[20px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Acoustic Sweep</h2><p className="text-[13px] text-slate-600 leading-snug">Place the phone near the container as it was during calibration. The app plays 16 controlled tones and compares the response against this device&apos;s saved Full and Empty references.</p></div>

        <div className={`p-4 rounded-2xl border space-y-2.5 ${calibrated ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase font-mono">CALIBRATION</span><span className={`text-xs font-bold ${calibrated ? 'text-emerald-700' : 'text-amber-700'}`}>{calibrated ? '3 FULL + 3 EMPTY SAVED' : hasRequiredSamples(calibration || { fullSamples: [], emptySamples: [] }) ? 'REFERENCES OVERLAP' : 'NOT CALIBRATED'}</span></div>
          <div className="flex items-start gap-2"><Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /><p aria-live="polite" className="text-[12px] text-slate-600 leading-snug">{status}</p></div>
          {!calibrated && <button onClick={() => onNavigate('calibration')} className="w-full mt-1 h-10 rounded-xl bg-[#00A3B4] text-white text-xs font-semibold cursor-pointer">Open Calibration</button>}
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </div>

        {result && <div className={`rounded-2xl border p-4 space-y-3 ${resultTone === 'amber' ? 'bg-amber-50 border-amber-200' : resultTone === 'emerald' ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">{resultTone === 'amber' ? <AlertTriangle className="w-5 h-5 text-amber-700" /> : <CheckCircle2 className="w-5 h-5 text-emerald-700" />}<span className="text-sm font-bold text-slate-900">Acoustic result</span></div>
          </div>

          {result.fillPercentage === null ? (
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-amber-800 tracking-wider uppercase font-mono">RECHECK ACOUSTIC CAPTURE</span>
              <p className="text-[12px] text-amber-900 leading-snug">{result.withheldReason || 'No trustworthy fill estimate could be produced from this capture.'}</p>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">ESTIMATED FILL LEVEL</span>
              <div className="flex items-end gap-2">
                <span className="text-[34px] leading-none font-extrabold text-slate-900 font-mono">{result.fillPercentage}%</span>
                <span className="pb-1 text-[11px] font-bold text-slate-600">estimated, not measured</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div><span className="block text-[9px] uppercase tracking-wide text-slate-500">Full ref</span><strong className="text-xs text-slate-800">{(result.fullSimilarity * 100).toFixed(1)}%</strong></div>
            <div><span className="block text-[9px] uppercase tracking-wide text-slate-500">Empty ref</span><strong className="text-xs text-slate-800">{(result.emptySimilarity * 100).toFixed(1)}%</strong></div>
            <div><span className="block text-[9px] uppercase tracking-wide text-slate-500">Gap</span><strong className="text-xs text-slate-800">{(result.gap * 100).toFixed(2)}%</strong></div>
          </div>

          <p className="text-[11px] text-slate-600 leading-snug">
            Direction only: <strong className="text-slate-800">{directionLabel}</strong>. Calibrated against this device&apos;s Full and Empty references.
          </p>
          {result.fillEstimateMethod && <p className="text-[10px] text-slate-500 leading-snug font-mono">METHOD: {result.fillEstimateMethod}</p>}
          <p className="text-[10px] text-slate-500 leading-snug">This is a relative estimate between two local calibration anchors. It is not a weight, a certified gas volume, or a precise measurement, and it is not a substitute for a regulated scale.</p>

          {result.prediction === 'recheck' && <p className="text-xs text-amber-800 leading-snug">This capture is closer than the separation in your saved references. Reposition the phone, reduce noise, and run the sweep again.</p>}
          <div className="border-t border-slate-200/70 pt-3"><p className="text-[11px] text-slate-600 mb-2">Validation only - what was the actual known state?</p><div className="grid grid-cols-2 gap-2"><button onClick={() => void labelActualState('full')} disabled={!!result.actualLabel} className="h-9 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 disabled:opacity-60 cursor-pointer">{result.actualLabel === 'full' ? 'Actual: Full' : 'Mark Full'}</button><button onClick={() => void labelActualState('empty')} disabled={!!result.actualLabel} className="h-9 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 disabled:opacity-60 cursor-pointer">{result.actualLabel === 'empty' ? 'Actual: Empty' : 'Mark Empty'}</button></div></div>
        </div>}

        <div className="grid grid-cols-2 gap-3"><div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90"><span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">CAPTURE ENERGY</span><div className="mt-1 flex items-center gap-2"><Volume2 className="w-4 h-4 text-cyan-600" /><span className="text-[15px] font-bold text-slate-800 font-mono">{energy ?? '-'} dB</span></div></div><div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/90"><span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">REFERENCE GAP</span><div className="mt-1 flex items-center gap-2"><Waves className="w-4 h-4 text-cyan-600" /><span className="text-[15px] font-bold text-slate-800 font-mono">{result ? `${result.confidence}%` : '-'}</span></div></div></div>

        {/* Fallback method: the tone sweep measures loudness, which this container
            type barely changes with fill level. The tap test measures ring time
            and brightness instead, and needs no speaker. */}
        <button
          id="open-tap-check-btn"
          onClick={() => onNavigate('tap-check')}
          className="w-full h-11 rounded-xl border border-[#00A3B4] bg-cyan-50 text-[#007C89] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Hammer className="w-4 h-4" />
          Try the tap test instead
        </button>

        <div className="pt-2 mt-auto pb-1 space-y-2"><button id="start-acoustic-sweep-btn" onClick={() => void runCheck()} disabled={isCapturing} className="w-full h-12.5 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer text-sm"><Mic className="w-4.5 h-4.5" />{isCapturing ? 'Capturing...' : calibrated ? 'Play sweep + capture' : 'Calibrate before checking'}</button>{result && <button id="complete-sweep-btn" onClick={() => onNavigate('review-evidence')} className="w-full h-11 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm">Continue to review <ArrowRight className="w-4 h-4" /></button>}</div>
      </div>
      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
