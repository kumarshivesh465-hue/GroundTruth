import React, { useEffect, useRef, useState } from 'react';
import { AppScreen } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { ArchiveRestore, CheckCircle2, Circle, Download, Hammer, Info, RotateCcw, Upload } from 'lucide-react';
import { captureTapResponse, TAP_WINDOW_MS } from '../../tap.js';
import {
  DEFAULT_LEVELS, REQUIRED_SAMPLES, STRIKER_OPTIONS, addTapSample, exportTapCalibration,
  getTapCalibration, hasRequiredTapSamples, importTapCalibration, isTapCalibrated,
  resetTapCalibration, tapQuality,
} from '../../tap-store.js';

interface TapCalibrationScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
}

/**
 * Calibration for the tap test. Levels are user-extensible rather than fixed to
 * Full and Empty, because the tap response can separate intermediate fill states.
 */
export const TapCalibrationScreen: React.FC<TapCalibrationScreenProps> = ({ onNavigate, onOpenNotifications }) => {
  const [calibration, setCalibration] = useState<any>(null);
  const [levelId, setLevelId] = useState('empty');
  const [customName, setCustomName] = useState('');
  const [customPercent, setCustomPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [strikerId, setStrikerId] = useState('hand-fixed');
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState('Hold the phone a few centimetres from the container, then tap it once.');
  const [error, setError] = useState('');
  const [lastFeatures, setLastFeatures] = useState<any>(null);
  const [quality, setQuality] = useState<any>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const saved = await getTapCalibration();
    setCalibration(saved);
    setNotes(saved.notes || '');
  };
  useEffect(() => { void refresh(); }, []);

  const levels = [
    ...DEFAULT_LEVELS,
    // Any custom levels already stored, so they stay selectable.
    ...Object.values<any>(calibration?.levels || {})
      .filter((entry) => !DEFAULT_LEVELS.some((base) => base.id === entry.id))
      .map((entry) => ({ id: entry.id, name: entry.name, fillPercent: entry.fillPercent })),
  ];
  const selectedLevel = levels.find((level) => level.id === levelId) || levels[0];
  const countFor = (id: string) => calibration?.levels?.[id]?.samples?.length || 0;

  const addCustomLevel = () => {
    const name = customName.trim();
    if (!name) { setError('Give the custom level a name first.'); return; }
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    setLevelId(id);
    setCustomName('');
    setError('');
    setMessage(`Custom level "${name}" selected. Record ${REQUIRED_SAMPLES} taps for it.`);
  };

  const record = async () => {
    setError('');
    setIsCapturing(true);
    try {
      const result = await captureTapResponse(setMessage, TAP_WINDOW_MS);
      // Record which striker was used: the impact is the excitation signal, so
      // mixing strikers inside a level would blend two different measurements.
      result.features.strikerId = strikerId;
      setLastFeatures(result.features);
      setQuality(tapQuality(result));
      const level = levelId.startsWith('custom-') && selectedLevel?.fillPercent == null
        ? { id: levelId, name: customName.trim() || levelId, fillPercent: customPercent === '' ? null : Number(customPercent) }
        : { id: selectedLevel.id, name: selectedLevel.name, fillPercent: selectedLevel.fillPercent };
      const next = await addTapSample(level, result, notes);
      setCalibration(next);
      const saved = next.levels[level.id]?.samples?.length || 0;
      setMessage(`${level.name} reference ${saved}/${REQUIRED_SAMPLES} saved. Ring time ${Math.round(result.features.decayMs)} ms, brightness ${Math.round(result.features.centroidHz)} Hz.`);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'That tap could not be recorded.');
      setMessage('Tap once, firmly, while the phone is listening. Avoid tapping the table instead.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleExport = () => {
    const url = URL.createObjectURL(new Blob([exportTapCalibration(calibration)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `groundtruth-tap-calibration-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Tap calibration backup downloaded.');
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all tap references? Validation history is kept.')) return;
    setCalibration(await resetTapCalibration());
    setMessage('Tap calibration reset. Record references again.');
    setError('');
  };

  const ready = isTapCalibrated(calibration);

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar title="Tap Calibration" showBack onBack={() => onNavigate('acoustic-check')} showBell hasUnreadNotifications onBellClick={onOpenNotifications} />
      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        <div className={`rounded-2xl border p-4 ${ready ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex gap-3 items-start">
            <Hammer className="w-5 h-5 shrink-0 mt-0.5 text-[#007C89]" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{ready ? 'Tap calibration ready' : 'Tap calibration required'}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                Tap the container once and the app measures how long it rings and how bright it sounds.
                Save {REQUIRED_SAMPLES} taps for each known level. A full container rings sharply for longer;
                an empty one gives a short, dull thud.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {levels.map((level) => {
            const current = countFor(level.id);
            return (
              <button
                key={level.id}
                onClick={() => setLevelId(level.id)}
                className={`rounded-2xl border p-3 text-left transition-colors cursor-pointer ${levelId === level.id ? 'border-[#00A3B4] bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white'}`}
              >
                <span className="block text-[10px] font-bold tracking-wider uppercase font-mono text-slate-500">
                  {level.name}{level.fillPercent != null ? ` \u00b7 ${level.fillPercent}%` : ''}
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  {Array.from({ length: REQUIRED_SAMPLES }, (_, index) => (index < current
                    ? <CheckCircle2 key={index} className="w-5 h-5 text-emerald-600" />
                    : <Circle key={index} className="w-5 h-5 text-slate-300" />))}
                </div>
                <span className="mt-2 block text-sm font-bold text-slate-800">{current}/{REQUIRED_SAMPLES} saved</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Add a custom level</h3>
          <p className="text-[11px] text-slate-600 leading-snug">
            The tap test can separate intermediate fill states, so you can calibrate any level you care about.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Name (for example 80% full)" className="h-10 rounded-xl border border-slate-200 px-3 text-xs" />
            <input value={customPercent} onChange={(event) => setCustomPercent(event.target.value)} inputMode="numeric" placeholder="Fill % (optional)" className="h-10 rounded-xl border border-slate-200 px-3 text-xs" />
          </div>
          <button onClick={addCustomLevel} className="w-full h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 cursor-pointer">Select this level</button>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Record {selectedLevel?.name} reference</h3>
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-600 font-mono">WHAT STRIKES THE CONTAINER</span>
            <select
              value={strikerId}
              onChange={(event) => setStrikerId(event.target.value)}
              className="w-full h-10 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700"
            >
              {STRIKER_OPTIONS.map((striker) => (
                <option key={striker.id} value={striker.id}>{striker.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 leading-snug">
              {STRIKER_OPTIONS.find((striker) => striker.id === strikerId)?.note}
            </p>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Hold the phone a few centimetres from the container and tap the same spot once, with similar force each time.
            Do not press the phone against the container: contact couples hand movement into the reading.
          </p>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Setup notes (optional)" className="w-full rounded-xl border border-slate-200 p-3 text-xs" />
          <button
            id="record-tap-reference-btn"
            onClick={() => void record()}
            disabled={isCapturing || countFor(selectedLevel?.id) >= REQUIRED_SAMPLES}
            className="w-full h-12 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Hammer className="w-4.5 h-4.5" />
            {isCapturing ? 'Listening for a tap...' : countFor(selectedLevel?.id) >= REQUIRED_SAMPLES ? 'All references saved' : 'Record tap'}
          </button>
          {lastFeatures && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><span className="block text-[9px] font-bold text-slate-500">RING</span><span className="font-bold text-slate-800">{Math.round(lastFeatures.decayMs)} ms</span></div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><span className="block text-[9px] font-bold text-slate-500">BRIGHTNESS</span><span className="font-bold text-slate-800">{Math.round(lastFeatures.centroidHz)} Hz</span></div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><span className="block text-[9px] font-bold text-slate-500">SNR</span><span className="font-bold text-slate-800">{lastFeatures.snrDb?.toFixed(0)} dB</span></div>
              </div>
              {quality && (
                <div className={`rounded-lg border p-2 text-[11px] leading-snug ${quality.grade === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : quality.grade === 'marginal' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                  <strong>Strike quality: {quality.grade}.</strong> {quality.message}
                </div>
              )}
            </div>
          )}
          <p aria-live="polite" className="text-center text-[11px] text-slate-500">{message}</p>
          {error && <p role="alert" className="text-center text-xs text-red-700">{error}</p>}
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2"><ArchiveRestore className="w-4 h-4 text-slate-600" /><h3 className="text-sm font-bold text-slate-900">Device backup</h3></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExport} disabled={!Object.keys(calibration?.levels || {}).length} className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"><Download className="w-4 h-4" />Export</button>
            <button onClick={() => importInput.current?.click()} className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-4 h-4" />Import</button>
          </div>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setError('');
              try {
                setCalibration(await importTapCalibration(await file.text()));
                setMessage('Tap calibration backup restored.');
              } catch (importError) {
                setError(importError instanceof Error ? importError.message : 'Could not import that backup.');
              } finally { event.target.value = ''; }
            }}
          />
          <button onClick={() => void handleReset()} className="w-full text-xs font-semibold text-red-700 flex justify-center items-center gap-1.5 cursor-pointer py-1"><RotateCcw className="w-3.5 h-3.5" />Reset tap calibration</button>
        </div>

        <div className="flex gap-2 text-[11px] text-slate-500 leading-snug">
          <Info className="w-4 h-4 shrink-0" />
          The tap test measures how the container rings, not how loud it is. It also needs no speaker, so the phone cannot leak sound into its own microphone.
        </div>
      </div>
      <BottomNav currentScreen="calibration" onNavigate={onNavigate} />
    </div>
  );
};
