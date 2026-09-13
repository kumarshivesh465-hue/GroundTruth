import React, { useEffect, useState } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { AlertTriangle, ArrowRight, CheckCircle2, Hammer, Info, Settings2, TrendingDown } from 'lucide-react';
import { captureTapResponse, TAP_WINDOW_MS } from '../../tap.js';
import { classifyTap, getTapCalibration, getTapHistory, isTapCalibrated, saveTapTest, setTapActualLabel, tapValidationSummary } from '../../tap-store.js';
import { SCREENING_INTENTS } from '../../tap-store.js';

interface TapCheckScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  session?: VerificationSession;
  setSession?: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

/**
 * Live tap check. Reports the nearest calibrated level plus a graded estimate,
 * and falls back to "recheck" whenever the two closest levels are too near.
 */
export const TapCheckScreen: React.FC<TapCheckScreenProps> = ({ onNavigate, onOpenNotifications, session, setSession }) => {
  const [calibration, setCalibration] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('Checking tap calibration...');
  const [error, setError] = useState('');
  const [features, setFeatures] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [intentId, setIntentId] = useState('gauge-crosscheck');

  const refresh = async () => {
    const [saved, savedHistory] = await Promise.all([getTapCalibration(), getTapHistory()]);
    setCalibration(saved);
    setHistory(savedHistory);
    setStatus(isTapCalibrated(saved) ? 'Ready. Tap the container once, firmly, on the same spot you calibrated.' : 'Not calibrated. Save at least two levels with three tap references each.');
  };
  useEffect(() => { void refresh(); }, []);

  const runCheck = async () => {
    if (!isTapCalibrated(calibration)) { onNavigate('tap-calibration'); return; }
    setIsCapturing(true); setError(''); setResult(null); setFeatures(null);
    try {
      const capture = await captureTapResponse(setStatus, TAP_WINDOW_MS);
      setFeatures(capture.features);
      const comparison = classifyTap(capture, calibration);
      const vesselId = session?.vesselId ?? null;
      // The fingerprint is kept so this vessel can later be compared against
      // its own history for contamination / damage drift.
      const saved = await saveTapTest({ ...comparison, fingerprint: capture.fingerprint, vesselId, intent: intentId });
      setResult({ ...comparison, id: saved.id });
      setHistory(await getTapHistory());
      // Hand the tap result to the session: without this the reconciliation
      // step has no tap evidence and can only ever return RECHECK.
      setSession?.((previous) => ({
        ...previous,
        vesselId: vesselId || previous.vesselId,
        tapEvidence: {
          prediction: comparison.prediction === 'level' ? 'level' : 'recheck',
          levelId: comparison.nearestLevelId ?? null,
          levelName: comparison.nearestLevelName ?? null,
          estimatePercent: comparison.estimatePercent ?? null,
          confidence: Number.isFinite(comparison.marginRatio) ? comparison.marginRatio : null,
          message: comparison.message,
          capturedAt: new Date().toISOString(),
          vesselId,
        },
      }));
      setStatus(comparison.prediction === 'level'
        ? `Closest to "${comparison.nearestLevelName}". Tap result saved locally.`
        : 'This tap could not be placed reliably. Tap again, a little firmer.');
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'That tap could not be analysed.');
      setStatus('Tap the container once, firmly, while the phone is listening.');
    } finally { setIsCapturing(false); }
  };

  const labelActual = async (levelId: string) => {
    if (!result) return;
    try {
      await setTapActualLabel(result.id, levelId);
      setResult({ ...result, actualLabel: levelId });
      setHistory(await getTapHistory());
      setStatus('Actual level saved. Calibration references were not changed.');
    } catch (labelError) { setError(labelError instanceof Error ? labelError.message : 'Could not save that label.'); }
  };

  const ready = isTapCalibrated(calibration);
  const summary = tapValidationSummary(history);
  const confident = result?.prediction === 'level';
  const calibratedLevels = Object.values<any>(calibration?.levels || {}).filter((entry) => entry.samples.length >= 3);

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Tap Check"
        showBack
        onBack={() => onNavigate('home')}
        showBell
        hasUnreadNotifications
        onBellClick={onOpenNotifications}
        rightAction={
          <button onClick={() => onNavigate('tap-calibration')} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label="Open tap calibration"><Settings2 className="w-5 h-5" /></button>
        }
      />
      <div className="flex-1 px-5 py-3 space-y-3.5 overflow-y-auto flex flex-col">
        <div className="relative w-full h-40 rounded-2xl bg-gradient-to-br from-[#93A5B8] via-[#B4C5D4] to-[#C9D9E5] overflow-hidden flex flex-col items-center justify-center p-3 shadow-inner">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-36 h-36 rounded-full border border-cyan-400/40 ${isCapturing ? 'animate-ping' : ''}`} style={{ animationDuration: '2.5s' }} />
            <div className={`absolute w-24 h-24 rounded-full border-2 border-cyan-300/50 ${isCapturing ? 'animate-pulse' : ''}`} />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-[#00A3B4] border-2 border-white/80 shadow-md flex items-center justify-center text-white"><Hammer className="w-7 h-7" /></div>
            <span className="mt-2 text-xs font-extrabold tracking-widest text-slate-800 uppercase font-mono">{isCapturing ? 'LISTENING...' : ready ? 'READY' : 'SETUP REQUIRED'}</span>
            <span className="text-[9px] tracking-wider text-slate-700 font-mono font-semibold">TAP RESPONSE - RING TIME + BRIGHTNESS</span>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Tap Check</h2>
          <p className="text-[13px] text-slate-600 leading-snug">
            Strike the container once the same way you did during calibration. The app measures how long it rings
            and how bright it sounds, then compares that with your saved references.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="screening-intent" className="block text-[10px] font-bold text-slate-600 font-mono">WHAT ARE YOU CHECKING?</label>
          <select
            id="screening-intent"
            value={intentId}
            onChange={(event) => setIntentId(event.target.value)}
            className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700"
          >
            {SCREENING_INTENTS.map((intent) => (
              <option key={intent.id} value={intent.id}>{intent.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 leading-snug">
            {SCREENING_INTENTS.find((intent) => intent.id === intentId)?.note}
          </p>
        </div>

        <div className={`p-4 rounded-2xl border space-y-2.5 ${ready ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 tracking-wider uppercase font-mono">CALIBRATION</span>
            <span className={`text-xs font-bold ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>{ready ? `${calibratedLevels.length} LEVELS SAVED` : 'NOT CALIBRATED'}</span>
          </div>
          <div className="flex items-start gap-2"><Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" /><p aria-live="polite" className="text-[12px] text-slate-600 leading-snug">{status}</p></div>
          {!ready && <button onClick={() => onNavigate('tap-calibration')} className="w-full mt-1 h-10 rounded-xl bg-[#00A3B4] text-white text-xs font-semibold cursor-pointer">Open Tap Calibration</button>}
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        </div>

        {result && (
          <div className={`rounded-2xl border p-4 space-y-3 ${confident ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2">
              {confident ? <CheckCircle2 className="w-5 h-5 text-emerald-700" /> : <AlertTriangle className="w-5 h-5 text-amber-700" />}
              <span className="text-sm font-bold text-slate-900">{confident ? 'Nearest calibrated level' : 'Not enough separation to decide'}</span>
            </div>

            {confident ? (
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">CLOSEST MATCH</span>
                <div className="flex items-end gap-2">
                  <span className="text-[30px] leading-none font-extrabold text-slate-900">{result.nearestLevelName}</span>
                  {result.estimatePercent != null && <span className="pb-1 text-[12px] font-bold text-slate-600">~{result.estimatePercent}% fill</span>}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-amber-900 leading-snug">{result.message}</p>
            )}

            {features && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><span className="block text-[9px] uppercase tracking-wide text-slate-500">Ring</span><strong className="text-xs text-slate-800">{Math.round(features.decayMs)} ms</strong></div>
                <div><span className="block text-[9px] uppercase tracking-wide text-slate-500">Brightness</span><strong className="text-xs text-slate-800">{Math.round(features.centroidHz)} Hz</strong></div>
                <div><span className="block text-[9px] uppercase tracking-wide text-slate-500">Peak</span><strong className="text-xs text-slate-800">{features.peakHz} Hz</strong></div>
              </div>
            )}

            {result.scores?.length > 0 && (
              <div className="border-t border-slate-200/70 pt-2 space-y-1">
                {result.scores.slice(0, 4).map((score: any, index: number) => (
                  <div key={score.id} className="flex items-center justify-between text-[11px]">
                    <span className={index === 0 ? 'font-bold text-slate-800' : 'text-slate-600'}>{score.id}</span>
                    <span className="font-mono text-slate-500">distance {score.distance.toFixed(3)}</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-500 pt-1">Lower distance is a closer match. Margin over the runner-up: {result.margin.toFixed(3)}.</p>
              </div>
            )}

            <p className="text-[10px] text-slate-500 leading-snug">
              This is a screening result: a nearest-reference comparison against your own calibration. It is not a
              measurement of gas quantity, not a custody-transfer reading, and not a substitute for a certified
              gauge. Treat a flagged result as a reason for a human to verify, never as proof.
            </p>

            {calibratedLevels.length > 0 && (
              <div className="border-t border-slate-200/70 pt-3">
                <p className="text-[11px] text-slate-600 mb-2">Validation only - what was the actual known level?</p>
                <div className="flex flex-wrap gap-2">
                  {calibratedLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => void labelActual(level.id)}
                      disabled={!!result.actualLabel}
                      className="h-8 px-3 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 disabled:opacity-60 cursor-pointer"
                    >
                      {result.actualLabel === level.id ? `Actual: ${level.name}` : level.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {history.length > 0 && (
          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-slate-500">Tap history</span>
              <span className="text-xs font-bold text-slate-800">{summary.labelled ? `${summary.correct}/${summary.labelled} \u00b7 ${summary.accuracy}%` : 'No labelled tests'}</span>
            </div>
          </div>
        )}

        <div className="pt-2 mt-auto pb-1 space-y-2">
          <button
            id="start-tap-check-btn"
            onClick={() => void runCheck()}
            disabled={isCapturing}
            className="w-full h-12.5 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2 shadow-xs cursor-pointer text-sm"
          >
            <Hammer className="w-4.5 h-4.5" />{isCapturing ? 'Listening for a tap...' : ready ? 'Listen for my tap' : 'Calibrate before checking'}
          </button>
          {result && (
            <button id="continue-review-btn" onClick={() => onNavigate('review-evidence')} className="w-full h-11 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm">
              Continue to review <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {result?.prediction === 'level' && (
            <button
              id="trend-link-btn"
              onClick={() => onNavigate('vessel-trend')}
              className="w-full h-11 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <TrendingDown className="w-4 h-4" />Log reading &amp; view trend
            </button>
          )}
        </div>
      </div>
      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
