import React, { useEffect, useRef, useState } from 'react';
import { AppScreen } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { ArchiveRestore, CheckCircle2, Circle, Download, Info, Mic, RotateCcw, Upload, Waves } from 'lucide-react';
import { captureAcousticResponse } from '../../acoustic.js';
import {
  REQUIRED_SAMPLES,
  addCalibrationSample,
  calibrationQuality,
  exportCalibration,
  getAcousticHistory,
  getCalibration,
  hasRequiredSamples,
  importCalibration,
  isCalibrated,
  resetCalibration,
  validationSummary,
} from '../../acoustic-store.js';

interface CalibrationScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({ onNavigate, onOpenNotifications }) => {
  const [calibration, setCalibration] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [label, setLabel] = useState<'full' | 'empty'>('full');
  const [notes, setNotes] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState('Load a known state, keep the phone position fixed, then record its reference.');
  const [error, setError] = useState('');
  const importInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [savedCalibration, savedHistory] = await Promise.all([getCalibration(), getAcousticHistory()]);
    setCalibration(savedCalibration);
    setHistory(savedHistory);
    setNotes(savedCalibration.notes || '');
  };

  useEffect(() => { void refresh(); }, []);

  const recordReference = async () => {
    setError('');
    setIsCapturing(true);
    console.log('[GroundTruth Acoustic] calibration-record-requested', { label });
    try {
      const response = await captureAcousticResponse(setMessage);
      console.log('[GroundTruth Acoustic] calibration-response-received', { label, averageEnergy: response.averageEnergy, sampleCount: response.sampleCount, fingerprintBins: response.fingerprint.length });
      const next = await addCalibrationSample(label, response.fingerprint, notes);
      setCalibration(next);
      console.log('[GroundTruth Acoustic] calibration-ui-updated', { label, savedCount: next[label === 'full' ? 'fullSamples' : 'emptySamples'].length, requiredSamples: REQUIRED_SAMPLES });
      setMessage(`${label === 'full' ? 'Full' : 'Empty'} reference ${next[label === 'full' ? 'fullSamples' : 'emptySamples'].length}/${REQUIRED_SAMPLES} saved. No audio was retained.`);
    } catch (captureError) {
      console.error('[GroundTruth Acoustic] calibration-record-failed', captureError);
      setError(captureError instanceof Error ? captureError.message : 'The reference could not be recorded.');
      setMessage('Allow microphone access, reduce background noise, and try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset both Full and Empty references? Existing validation history will stay intact.')) return;
    console.warn('[GroundTruth Acoustic] calibration-reset-requested');
    setCalibration(await resetCalibration());
    setMessage('Calibration reset. Record three Full and three Empty references again.');
    setError('');
  };

  const handleExport = async () => {
    const backup = await exportCalibration();
    const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `groundtruth-calibration-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Calibration backup downloaded. Store it somewhere safe before clearing browser data.');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const restored = await importCalibration(await file.text());
      setCalibration(restored);
      setNotes(restored.notes || '');
      setMessage('Calibration backup restored to this browser.');
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Could not import that backup.');
    } finally {
      event.target.value = '';
    }
  };

  const summary = validationSummary(history);
  const count = (kind: 'full' | 'empty') => calibration?.[kind === 'full' ? 'fullSamples' : 'emptySamples']?.length || 0;
  const quality = calibration ? calibrationQuality(calibration) : null;

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar title="Acoustic Calibration" showBack onBack={() => onNavigate('acoustic-check')} showBell hasUnreadNotifications onBellClick={onOpenNotifications} />
      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        <div className={`rounded-2xl border p-4 ${isCalibrated(calibration || { fullSamples: [], emptySamples: [] }) ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex gap-3 items-start">
            <Waves className="w-5 h-5 shrink-0 mt-0.5 text-[#007C89]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{isCalibrated(calibration || { fullSamples: [], emptySamples: [] }) ? 'Calibration ready' : hasRequiredSamples(calibration || { fullSamples: [], emptySamples: [] }) ? 'References need recapture' : 'Calibration required'}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">Save exactly {REQUIRED_SAMPLES} references for each known state. Later checks compare only against these saved averages; they never overwrite them.</p>
            </div>
          </div>
        </div>

        {quality && hasRequiredSamples(calibration || { fullSamples: [], emptySamples: [] }) && !quality.ready && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><strong>Reference quality is too weak for a reliable prediction.</strong><br />{quality.message} Weakest class margin: {(quality.weakestMargin * 100).toFixed(2)}%.</div>}

        <div className="grid grid-cols-2 gap-3">
          {(['full', 'empty'] as const).map((kind) => {
            const current = count(kind);
            return <button key={kind} onClick={() => setLabel(kind)} className={`rounded-2xl border p-3 text-left transition-colors cursor-pointer ${label === kind ? 'border-[#00A3B4] bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white'}`}>
              <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-slate-500">Known {kind}</span>
              <div className="mt-2 flex items-center gap-1.5">{Array.from({ length: REQUIRED_SAMPLES }, (_, index) => index < current ? <CheckCircle2 key={index} className="w-5 h-5 text-emerald-600" /> : <Circle key={index} className="w-5 h-5 text-slate-300" />)}</div>
              <span className="mt-2 block text-sm font-bold text-slate-800">{current}/{REQUIRED_SAMPLES} saved</span>
            </button>;
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Record {label === 'full' ? 'Known Full' : 'Known Empty'} reference</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">Use the same phone position near the same container for all three recordings. This records a 16-tone resonance response over about 3 seconds, not an audio file.</p>
          </div>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Phone / container notes (optional)" className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A3B4]/40" />
          <button id="record-calibration-reference-btn" onClick={() => void recordReference()} disabled={isCapturing || count(label) >= REQUIRED_SAMPLES} className="w-full h-12 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer">
            <Mic className="w-4.5 h-4.5" />{isCapturing ? 'Recording sweep…' : count(label) >= REQUIRED_SAMPLES ? 'All references saved' : 'Record reference'}
          </button>
          <p aria-live="polite" className="text-center text-[11px] text-slate-500">{message}</p>
          {error && <p role="alert" className="text-center text-xs text-red-700">{error}</p>}
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2"><ArchiveRestore className="w-4 h-4 text-slate-600" /><h3 className="text-sm font-bold text-slate-900">Device backup</h3></div>
          <p className="text-xs leading-relaxed text-slate-600">Calibration is local to this browser. Export it before clearing site data or uninstalling the PWA.</p>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => void handleExport()} className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" />Export</button><button onClick={() => importInput.current?.click()} className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-4 h-4" />Import</button></div>
          <input ref={importInput} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void handleImport(event)} />
          <button onClick={() => void handleReset()} className="w-full text-xs font-semibold text-red-700 flex justify-center items-center gap-1.5 cursor-pointer py-1"><RotateCcw className="w-3.5 h-3.5" />Reset and recalibrate</button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-wider uppercase font-mono text-slate-500">Validation history</span><span className="text-xs font-bold text-slate-800">{summary.labelled ? `${summary.correct}/${summary.labelled} · ${summary.accuracy}%` : 'No labelled tests'}</span></div>
          <p className="mt-2 text-xs text-slate-600">Optional actual-state labels update accuracy only; they never modify the references.</p>
          {history.length > 0 && <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">{history.slice(0, 5).map((entry) => <div key={entry.id} className="flex items-center justify-between text-[11px]"><span className="font-mono text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</span><span className="font-bold text-slate-800 uppercase">{entry.prediction}</span><span className={entry.actualLabel ? 'text-slate-600' : 'text-slate-400'}>{entry.actualLabel ? `actual ${entry.actualLabel}` : 'unlabelled'}</span></div>)}</div>}
        </div>
        <div className="flex gap-2 text-[11px] text-slate-500 leading-snug"><Info className="w-4 h-4 shrink-0" />Live checks return Recheck when the two saved profiles are too close to distinguish reliably.</div>
      </div>
      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
