import React, { useEffect, useRef, useState } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { transcribeBlob } from '../../speech.js';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { StepProgress } from '../components/StepProgress';
import { Mic, AlertCircle, ArrowRight, Square, RotateCcw, Volume2, Camera, LoaderCircle } from 'lucide-react';
import { VisionEvidenceCard } from '../components/VisionEvidenceCard';

interface RecordClaimScreenProps {
  onNavigate: (screen: AppScreen) => void;
  session: VerificationSession;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

const PREFERRED_AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/** Decode the captured file so the preview represents the real recording, not animation. */
async function createWaveform(blob: Blob): Promise<number[]> {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return [];
  const context = new AudioContextCtor();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = buffer.getChannelData(0);
    const bars = 48;
    const bucketSize = Math.max(1, Math.floor(samples.length / bars));
    return Array.from({ length: bars }, (_, bar) => {
      let peak = 0;
      const start = bar * bucketSize;
      const end = Math.min(samples.length, start + bucketSize);
      for (let index = start; index < end; index += 1) peak = Math.max(peak, Math.abs(samples[index]));
      return Math.max(0.04, Math.min(1, peak));
    });
  } finally {
    await context.close();
  }
}

export const RecordClaimScreen: React.FC<RecordClaimScreenProps> = ({ onNavigate, session, setSession }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(() => Math.round(session.audioDurationSeconds));
  const [captureError, setCaptureError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const captureVersionRef = useRef(0);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    captureVersionRef.current += 1;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    stopStream();
  }, []);

  const startTranscription = async (blob: Blob, version: number) => {
    try {
      const text = await transcribeBlob(blob, (message: string) => {
        if (captureVersionRef.current !== version) return;
        setSession((previous) => ({
          ...previous,
          transcriptionState: message.includes('Transcribing') ? 'transcribing' : 'loading-model',
        }));
      });
      if (captureVersionRef.current !== version) return;
      setSession((previous) => ({ ...previous, transcript: text || null, transcriptionState: 'complete', transcriptionError: null }));
    } catch (error) {
      if (captureVersionRef.current !== version) return;
      setSession((previous) => ({
        ...previous,
        transcriptionState: 'error',
        transcriptionError: error instanceof Error ? error.message : 'On-device transcription could not be completed.',
      }));
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setCaptureError('This browser does not support microphone recording. Use a current secure browser connection.');
      return;
    }
    setCaptureError(null);
    const version = ++captureVersionRef.current;
    try {
      // Permission is requested only after the worker explicitly starts a capture.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (captureVersionRef.current !== version) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = PREFERRED_AUDIO_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stopStream();
        if (captureVersionRef.current !== version || chunks.length === 0) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        const duration = Math.max(0, (performance.now() - (startedAtRef.current ?? performance.now())) / 1000);
        setSeconds(Math.round(duration));
        setSession((previous) => {
          if (previous.audioUrl) URL.revokeObjectURL(previous.audioUrl);
          return {
            ...previous,
            audioBlob: blob,
            audioUrl,
            audioMimeType: blob.type || null,
            audioDurationSeconds: duration,
            hasRecordedAudio: true,
            audioWaveform: [],
            audioCapturedAt: new Date().toISOString(),
            transcript: null,
            transcriptionState: 'loading-model',
            transcriptionError: null,
          };
        });
        void createWaveform(blob).then((audioWaveform) => {
          if (captureVersionRef.current === version) setSession((previous) => ({ ...previous, audioWaveform }));
        }).catch(() => {
          // Evidence remains usable when browser preview decoding is unavailable.
        });
        void startTranscription(blob, version);
      };
      recorder.start(250);
      startedAtRef.current = performance.now();
      setSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current !== null) setSeconds(Math.floor((performance.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (error) {
      setCaptureError(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access and try again.'
        : 'The microphone could not be started. Check that it is connected and not in use.');
      stopStream();
    }
  };

  const stopRecording = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRecording(false);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const handleResetRecord = () => {
    captureVersionRef.current += 1;
    if (isRecording) stopRecording();
    if (session.audioUrl) URL.revokeObjectURL(session.audioUrl);
    setSeconds(0);
    setCaptureError(null);
    setSession((previous) => ({
      ...previous,
      audioBlob: null, audioUrl: null, audioMimeType: null, audioDurationSeconds: 0,
      hasRecordedAudio: false, audioWaveform: [], audioCapturedAt: null, transcript: null,
      transcriptionState: 'idle', transcriptionError: null,
    }));
  };

  const waveform = session.audioWaveform.length ? session.audioWaveform : Array.from({ length: 24 }, () => 0.12);
  const hasAudio = Boolean(session.audioBlob && session.audioUrl);
  const transcriptionInProgress = session.transcriptionState === 'loading-model' || session.transcriptionState === 'transcribing';

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar title="Record Claim" showBack={true} onBack={() => onNavigate('capture')} showBell={false} />
      <StepProgress currentStep={2} totalSteps={4} stepLabel="AUDIO VERIFICATION" isBadge={false} />
      <div className="flex-1 px-5 py-3 space-y-4 overflow-y-auto flex flex-col">
        <div className="p-3.5 rounded-2xl bg-[#ECFEFF] border border-[#A5F3FC] flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-[#0E7490] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#0E7490] leading-snug font-medium">Please state the delivery location, time, and confirm that the cylinder seal was checked in front of the customer.</p>
        </div>
        {session.visionEvidence ? <VisionEvidenceCard evidence={session.visionEvidence} /> : <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 shadow-2xs"><Camera className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" /><p className="text-[13px] text-slate-500 leading-snug font-medium">No live visual detection was captured.</p></div>}
        <div className="w-full bg-[#0F172A] rounded-2xl p-5 flex flex-col items-center justify-between min-h-[220px] shadow-md relative overflow-hidden">
          <div className="relative w-full flex-1 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 h-16 justify-center my-2 w-full overflow-hidden">{waveform.map((amplitude, index) => <div key={index} className="w-1.5 rounded-full bg-gradient-to-t from-[#0284C7] to-[#38BDF8] transition-all duration-200" style={{ height: `${Math.max(12, amplitude * 100)}%`, opacity: isRecording ? 1 : hasAudio ? 0.85 : 0.4 }} />)}</div>
            <div className="text-3xl font-bold tracking-widest text-white font-mono my-1">{formatTimer(seconds)}</div>
            <span className="text-[11px] text-slate-400 font-mono tracking-wider">{isRecording ? 'RECORDING LIVE AUDIO...' : hasAudio ? 'RECORDING COMPLETE' : 'AUDIO CLAIM BUFFER'}</span>
          </div>
          {isRecording && <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none animate-pulse" />}
        </div>
        {captureError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{captureError}</p>}
        {hasAudio && <audio controls src={session.audioUrl ?? undefined} className="w-full h-9" aria-label="Recorded claim audio" />}
        <div className="flex flex-col items-center justify-center space-y-3 py-1">
          <p className="text-center text-[13.5px] text-slate-600 font-medium">{isRecording ? 'Speaking... tap square to finish.' : hasAudio ? 'Claim voice record ready for review.' : 'Tap the button below to request microphone access and start recording.'}</p>
          <div className="flex items-center justify-center gap-4">
            {hasAudio && <button onClick={handleResetRecord} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer" title="Discard and rerecord"><RotateCcw className="w-4 h-4" /></button>}
            <div className="relative flex items-center justify-center">{isRecording && <div className="absolute w-20 h-20 rounded-full bg-cyan-400/30 animate-ping" />}<button id="toggle-record-claim-btn" onClick={isRecording ? stopRecording : startRecording} className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95 cursor-pointer z-10 ${isRecording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#00A3B4] hover:bg-[#008D9B]'}`} aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}>{isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7 stroke-[2.2]" />}</button></div>
            {hasAudio && <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Volume2 className="w-4.5 h-4.5" /></div>}
          </div>
        </div>
        {transcriptionInProgress && <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-800 flex gap-2 items-center"><LoaderCircle className="w-4 h-4 animate-spin shrink-0" />{session.transcriptionState === 'loading-model' ? 'Loading Whisper on this device…' : 'Transcribing the recorded claim on this device…'}</div>}
        {session.transcriptionState === 'error' && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Audio was saved, but transcription was unavailable: {session.transcriptionError}</div>}
        {(session.transcriptionState === 'complete' || session.transcriptionState === 'error') && <label className="block text-xs font-semibold text-slate-700">Local transcript (editable)<textarea value={session.transcript ?? ''} onChange={(event) => setSession((previous) => ({ ...previous, transcript: event.target.value }))} placeholder="No speech detected. You may enter the claim here." className="mt-1.5 w-full min-h-22 rounded-xl border border-slate-300 p-3 text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500" /></label>}
        <div className="pt-2 mt-auto pb-2"><button id="continue-to-acoustic-btn" onClick={() => onNavigate('acoustic-check')} disabled={!hasAudio || isRecording} className="w-full h-13 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-base"><span>Continue to Acoustic Check</span><ArrowRight className="w-5 h-5 stroke-[2.2]" /></button>{!hasAudio && <p className="mt-2 text-center text-xs text-slate-500">A recorded claim is required to continue.</p>}</div>
      </div>
      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
