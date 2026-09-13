import React, { useEffect, useRef, useState } from 'react';
import { AppScreen } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import {
  AlertTriangle, CheckCircle2, Download, FlaskConical, Mic, Trash2, Upload, Waves,
} from 'lucide-react';
import { captureAcousticResponse } from '../../acoustic.js';
import {
  analyzeSeparability, buildDatasetRecord, clearDataset, datasetSummary,
  deleteDatasetRecord, exportDataset, exportDatasetCsv, listDatasetRecords, saveDatasetRecord,
} from '../../dataset-store.js';

interface DatasetCaptureScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
}

/**
 * Operator-facing data collection screen for the labelled dataset.
 * This is research tooling: it is intentionally denser than the product screens
 * and it refuses to store a capture that has no stated true state or provenance.
 */
export const DatasetCaptureScreen: React.FC<DatasetCaptureScreenProps> = ({ onNavigate, onOpenNotifications }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [label, setLabel] = useState<'full' | 'empty'>('full');
  const [labelSource, setLabelSource] = useState('');
  const [cylinderId, setCylinderId] = useState('');
  const [condition, setCondition] = useState('nominal');
  const [room, setRoom] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [mediaVolume, setMediaVolume] = useState('50');
  const [notes, setNotes] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [message, setMessage] = useState('Fill in the capture protocol, then record one labelled reading.');
  const [error, setError] = useState('');
  const importInput = useRef<HTMLInputElement>(null);

  const refresh = async () => setRecords(await listDatasetRecords());
  useEffect(() => { void refresh(); }, []);

  const capture = async () => {
    setError('');
    if (!cylinderId.trim()) { setError('Enter a cylinder or container identifier. It is the grouping key for the held-out split.'); return; }
    if (!labelSource.trim()) { setError('State how the true fill state was established, for example a measured weight.'); return; }
    setIsCapturing(true);
    try {
      const response = await captureAcousticResponse(setMessage);
      const record = buildDatasetRecord({
        label,
        labelSource,
        fingerprint: response.fingerprint,
        response,
        deviceModel,
        mediaVolume,
        protocol: { cylinderId, condition, room },
        notes,
      });
      await saveDatasetRecord(record);
      await refresh();
      setMessage(`Saved ${label} reading for ${cylinderId}. Total stored: ${records.length + 1}.`);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'The capture could not be stored.');
      setMessage('Check the label fields, then try the sweep again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const download = (text: string, extension: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `groundtruth-acoustic-dataset-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = datasetSummary(records);
  const analysis = analyzeSeparability(records);

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Dataset Capture"
        showBack
        onBack={() => onNavigate('calibration')}
        showBell
        hasUnreadNotifications
        onBellClick={onOpenNotifications}
      />
      <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
          <div className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-[#007C89]" /><h2 className="text-sm font-bold text-slate-900">Labelled capture protocol</h2></div>
          <p className="text-xs leading-relaxed text-slate-600">
            Fix the phone model, volume, position, container type, room and timing. Label the true state from a
            reliable source, ideally a measured weight. A capture with no stated provenance is not training data.
          </p>
        </div>

        {/* Separability gate: the decisive check before any classifier work. */}
        <div className={`rounded-2xl border p-4 space-y-2 ${analysis.insufficient ? 'bg-slate-50 border-slate-200' : analysis.ready ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2">
            {analysis.insufficient
              ? <Waves className="w-4 h-4 text-slate-600" />
              : analysis.ready
                ? <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                : <AlertTriangle className="w-4 h-4 text-amber-700" />}
            <h3 className="text-sm font-bold text-slate-900">
              {analysis.insufficient ? 'Not enough data yet' : analysis.ready ? 'Measurement is separable' : 'Measurement overlaps'}
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-700">{analysis.message}</p>
          {!analysis.insufficient && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
              <div className="rounded-lg bg-white/70 border border-slate-200 p-2">
                <span className="block text-[9px] font-bold text-slate-500 uppercase">Repeat shape mean</span>
                <span className="font-bold text-slate-800">{analysis.shape.within.mean.toFixed(3)}</span>
                <span className="block text-slate-500">n={analysis.shape.within.count}</span>
              </div>
              <div className="rounded-lg bg-white/70 border border-slate-200 p-2">
                <span className="block text-[9px] font-bold text-slate-500 uppercase">Full vs Empty shape mean</span>
                <span className="font-bold text-slate-800">{analysis.shape.between.mean.toFixed(3)}</span>
                <span className="block text-slate-500">n={analysis.shape.between.count}</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Capture protocol</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['full', 'empty'] as const).map((kind) => (
              <button
                key={kind}
                onClick={() => setLabel(kind)}
                className={`h-11 rounded-xl border text-xs font-bold cursor-pointer ${label === kind ? 'border-[#00A3B4] bg-cyan-50 ring-2 ring-cyan-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                TRUE {kind.toUpperCase()}
              </button>
            ))}
          </div>
          <input value={cylinderId} onChange={(event) => setCylinderId(event.target.value)} placeholder="Container ID (for example cylinder C-04)" className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs" />
          <input value={labelSource} onChange={(event) => setLabelSource(event.target.value)} placeholder="How was the true state established? (for example weighed 14.1 kg)" className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Condition" className="h-10 rounded-xl border border-slate-200 px-3 text-xs" />
            <input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="Room" className="h-10 rounded-xl border border-slate-200 px-3 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={deviceModel} onChange={(event) => setDeviceModel(event.target.value)} placeholder="Device model" className="h-10 rounded-xl border border-slate-200 px-3 text-xs" />
            <input value={mediaVolume} onChange={(event) => setMediaVolume(event.target.value)} inputMode="numeric" placeholder="Media volume" className="h-10 rounded-xl border border-slate-200 px-3 text-xs" />
          </div>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={2} placeholder="Placement / orientation notes (optional)" className="w-full rounded-xl border border-slate-200 p-3 text-xs" />
          <button id="record-dataset-sample-btn" onClick={() => void capture()} disabled={isCapturing} className="w-full h-12 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] disabled:bg-slate-300 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer">
            <Mic className="w-4.5 h-4.5" />{isCapturing ? 'Recording sweep...' : 'Record labelled reading'}
          </button>
          <p aria-live="polite" className="text-center text-[11px] text-slate-500">{message}</p>
          {error && <p role="alert" className="text-center text-xs text-red-700">{error}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Stored samples</h3>
            <span className="text-xs font-mono font-bold text-slate-700">{summary.total} total</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><span className="block text-[9px] font-bold text-slate-500">FULL</span><span className="font-bold text-slate-800">{summary.full}</span></div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><span className="block text-[9px] font-bold text-slate-500">EMPTY</span><span className="font-bold text-slate-800">{summary.empty}</span></div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><span className="block text-[9px] font-bold text-slate-500">CONTAINERS</span><span className="font-bold text-slate-800">{summary.cylinders}</span></div>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            A held-out split requires at least two containers with both states present. Split by container, never by random capture.
          </p>
          {records.length > 0 && (
            <div className="space-y-1.5 border-t border-slate-100 pt-3 max-h-56 overflow-y-auto">
              {records.slice(0, 12).map((record) => (
                <div key={record.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono text-slate-500">{new Date(record.createdAt).toLocaleTimeString()}</span>
                  <span className={`font-bold uppercase ${record.label === 'full' ? 'text-emerald-700' : 'text-sky-700'}`}>{record.label}</span>
                  <span className="truncate text-slate-600 max-w-[7rem]">{record.cylinderId}</span>
                  <span className="font-mono text-slate-500">{record.averageEnergyDb ?? '-'} dB</span>
                  <button onClick={() => void deleteDatasetRecord(record.id).then(refresh)} aria-label="Delete sample" className="text-slate-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Export</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => download(exportDataset(records), 'json', 'application/json')} disabled={!records.length} className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"><Download className="w-4 h-4" />JSON</button>
            <button onClick={() => download(exportDatasetCsv(records), 'csv', 'text/csv')} disabled={!records.length} className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"><Download className="w-4 h-4" />CSV</button>
          </div>
          <button onClick={() => importInput.current?.click()} className="w-full h-10 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"><Upload className="w-4 h-4" />Merge a dataset JSON</button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text());
                if (parsed?.kind !== 'groundtruth-acoustic-dataset' || !Array.isArray(parsed.records)) throw new Error('That file is not a GroundTruth dataset export.');
                for (const record of parsed.records) await saveDatasetRecord(record);
                await refresh();
                setMessage(`Merged ${parsed.records.length} samples.`);
              } catch (importError) {
                setError(importError instanceof Error ? importError.message : 'Could not read that dataset.');
              } finally { event.target.value = ''; }
            }}
          />
          <button
            onClick={async () => {
              if (!window.confirm('Delete every stored dataset sample from this browser? This cannot be undone.')) return;
              await clearDataset();
              await refresh();
              setMessage('Dataset cleared.');
            }}
            disabled={!records.length}
            className="w-full text-xs font-semibold text-red-700 flex justify-center items-center gap-1.5 disabled:opacity-50 cursor-pointer py-1"
          >
            <Trash2 className="w-3.5 h-3.5" />Clear dataset
          </button>
        </div>
      </div>
      <BottomNav currentScreen="calibration" onNavigate={onNavigate} />
    </div>
  );
};