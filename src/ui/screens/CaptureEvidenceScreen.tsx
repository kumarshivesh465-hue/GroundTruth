import React, { useState, useRef, useEffect } from 'react';
import { AppScreen, VerificationSession, VisionEvidence } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { CYLINDER_PRESETS } from '../data/mockData';
import { Zap, ZapOff, Scan, Camera, Info, Upload, Video, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';
import { captureImageEvidence, captureObjectEvidence } from '../../vision';

interface CaptureEvidenceScreenProps {
  onNavigate: (screen: AppScreen) => void;
  session: VerificationSession;
  setSession: React.Dispatch<React.SetStateAction<VerificationSession>>;
}

export const CaptureEvidenceScreen: React.FC<CaptureEvidenceScreenProps> = ({
  onNavigate,
  session,
  setSession,
}) => {
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<VisionEvidence | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activePreset = CYLINDER_PRESETS[selectedPresetIndex];

  const toggleWebcam = async () => {
    if (isWebcamActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsWebcamActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        // The <video> element only renders after isWebcamActive becomes true,
        // so stash the stream and attach it in the effect below.
        streamRef.current = stream;
        setIsWebcamActive(true);
      } catch (err) {
        console.warn('Webcam permission not granted or unavailable:', err);
        alert('Camera access needs HTTPS or localhost. On your phone, use USB port-forwarding to localhost or use the Upload button to take/select a photo for local seal comparison.');
      }
    }
  };

  // Attach the live stream once the video element has mounted
  useEffect(() => {
    if (isWebcamActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        /* autoplay restrictions — muted+playsInline should cover it */
      });
    }
  }, [isWebcamActive]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const runDetection = async (): Promise<VisionEvidence | null> => {
    if (!videoRef.current || !isWebcamActive) {
      setDetectionError('No live camera feed available. Enable webcam first.');
      return null;
    }

    setIsDetecting(true);
    setDetectionError(null);
    setDetectionResult(null);

    try {
      const result = await captureObjectEvidence(videoRef.current!);
      const evidence: VisionEvidence = {
        label: result.label || 'unknown',
        confidence: result.confidence,
        inferenceMs: result.inferenceMs,
        status: result.status,
        imageDataUrl: result.imageDataUrl,
      };
      setDetectionResult(evidence);
      return evidence;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Detection failed';
      setDetectionError(msg);
      console.error('Detection error:', err);
      return null;
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCapture = async () => {
    setIsCapturing(true);
    setDetectionError(null);

    let visionResult: VisionEvidence | null = null;
    if (isWebcamActive) {
      visionResult = await runDetection();
    }

    setSession((prev) => ({
      ...prev,
      selectedPreset: activePreset,
      outcome: activePreset.simulatedOutcome,
      capturedImage: visionResult?.imageDataUrl ?? activePreset.imageUrl,
      visionEvidence: visionResult
        ? {
            label: visionResult.label,
            confidence: visionResult.confidence,
            inferenceMs: visionResult.inferenceMs,
            status: visionResult.status,
            imageDataUrl: visionResult.imageDataUrl,
          }
        : null,
    }));

    setTimeout(() => {
      setIsCapturing(false);
      onNavigate('record-claim');
    }, 450);
  };

  const handlePresetChange = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = CYLINDER_PRESETS[idx];
    setSession((prev) => ({
      ...prev,
      selectedPreset: p,
      outcome: p.simulatedOutcome,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDetecting(true);
    setDetectionError(null);
    try {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('That image could not be read.'));
        image.src = objectUrl;
      });
      const result = await captureImageEvidence(image);
      const evidence: VisionEvidence = { label: result.label || 'unknown', confidence: result.confidence, inferenceMs: result.inferenceMs, status: result.status, imageDataUrl: result.imageDataUrl };
      setDetectionResult(evidence);
      setSession((prev) => ({
        ...prev,
        capturedImage: evidence.imageDataUrl,
        visionEvidence: evidence,
      }));
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setDetectionError(error instanceof Error ? error.message : 'Photo comparison failed.');
    } finally {
      setIsDetecting(false);
      e.target.value = '';
    }
  };

  return (
    <div className='flex-1 flex flex-col bg-white select-none'>
      <TopAppBar
        title='Capture Evidence'
        showBack={true}
        onBack={() => onNavigate('home')}
        showBell={false}
      />

      <div className='flex-1 flex flex-col px-4 pt-2 pb-3 space-y-3 overflow-y-auto'>
        <div className='flex items-center justify-between px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs'>
          <span className='text-[11px] font-bold text-slate-500 font-mono'>SCENARIO:</span>
          <div className='flex gap-1'>
            {CYLINDER_PRESETS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(i)}
                className={'px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ' +
                  (selectedPresetIndex === i
                    ? 'bg-[#00A3B4] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100')}
              >
                {p.simulatedOutcome === 'match'
                  ? 'Match'
                  : p.simulatedOutcome === 'mismatch'
                  ? 'Conflict'
                  : 'Low Clarity'}
              </button>
            ))}
          </div>
        </div>

        <div className='relative w-full aspect-[4/4.6] bg-black rounded-2xl overflow-hidden shadow-md flex items-center justify-center'>
          {isCapturing && (
            <div className='absolute inset-0 bg-white z-50 animate-out fade-out duration-300' />
          )}

          {isFlashOn && (
            <div className='absolute inset-0 bg-amber-100/15 pointer-events-none z-20' />
          )}

          {isWebcamActive ? (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className='w-full h-full object-cover'
              />
              {detectionResult && (
                <div className='absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-4'>
                  <div className='bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono flex flex-col items-center gap-1'>
                    <span className='font-semibold'>
                      {detectionResult.label} ({Math.round(detectionResult.confidence * 100)}%)
                    </span>
                    <span className='text-xs opacity-80'>
                      {detectionResult.status === 'detected' ? '\u2713 Detected' : '\u2717 Unclear'} {detectionResult.inferenceMs}ms
                    </span>
                  </div>
                </div>
              )}
              {isDetecting && (
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/80 text-white px-3 py-2 rounded-lg text-sm'>
                  <Loader2 className='w-4 h-4 animate-spin text-teal-400' />
                  <span className='text-xs'>Comparing local visual references...</span>
                </div>
              )}
              {detectionError && (
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-3 py-2 rounded-lg text-xs shadow-lg animate-in slide-in-from-bottom-4'>
                  <EyeOff className='w-3.5 h-3.5 mr-1.5' />
                  {detectionError}
                </div>
              )}
            </>
          ) : (
            <div className='relative w-full h-full flex items-center justify-center p-4 bg-[#6c6764]'>
              <div className='text-center text-white/60 text-sm'>
                <Camera className='w-10 h-10 mx-auto mb-2 opacity-50' />
                <div>Enable webcam for live detection</div>
                <div className='text-xs opacity-50 mt-1'>Local reference comparison runs on captured frames</div>
              </div>
            </div>
          )}

          {showGrid && isWebcamActive && (
            <div className='absolute inset-3 border-2 border-dashed border-white/75 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-3 z-20'>
              <div className='mt-1 px-4 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[12px] font-semibold tracking-wide border border-white/20 shadow-xs'>
                Align Cylinder Here
              </div>
              <div className='w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-scan absolute left-0' />
              <div />
            </div>
          )}

          <div className='absolute top-4 right-4 flex flex-col gap-2.5 z-30'>
            <button
              id='camera-flash-toggle'
              onClick={() => setIsFlashOn(!isFlashOn)}
              className={'w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md ' +
                (isFlashOn
                  ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-300'
                  : 'bg-black/50 text-white hover:bg-black/70')}
              title='Toggle Flash'
            >
              {isFlashOn ? <Zap className='w-4.5 h-4.5 fill-current' /> : <ZapOff className='w-4.5 h-4.5' />}
            </button>

            <button
              id='camera-grid-toggle'
              onClick={() => setShowGrid(!showGrid)}
              className={'w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md ' +
                (showGrid
                  ? 'bg-white/90 text-slate-900'
                  : 'bg-black/50 text-white hover:bg-black/70')}
              title='Toggle Alignment Guides'
            >
              <Scan className='w-4.5 h-4.5' />
            </button>

            <button
              id='camera-webcam-toggle'
              onClick={toggleWebcam}
              className={'w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md ' +
                (isWebcamActive
                  ? 'bg-teal-500 text-white'
                  : 'bg-black/50 text-white hover:bg-black/70')}
              title='Live Webcam'
            >
              <Video className='w-4.5 h-4.5' />
            </button>
          </div>
        </div>

        <div className='p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3 shadow-2xs'>
          <div className='w-5 h-5 rounded-full flex items-center justify-center text-[#008D9B] mt-0.5'>
            <Info className='w-4.5 h-4.5' />
          </div>
          <p className='text-[13px] text-slate-700 leading-snug'>
            Ensure the cylinder is upright and the top valve is clearly visible within the frame.
            {isWebcamActive && ' Centre the can lid in the guide for sealed/unsealed comparison against 7 sealed and 6 unsealed local references.'}
          </p>
        </div>

        {(detectionResult || detectionError) && (
          <div className={'p-3 rounded-xl border flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 ' +
            (detectionError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-teal-50 border-teal-200 text-teal-800')}>
            <div className='flex items-center gap-2'>
              {detectionError ? (
                <EyeOff className='w-4.5 h-4.5 text-red-600' />
              ) : (
                <Eye className='w-4.5 h-4.5 text-teal-600' />
              )}
              <div className='flex flex-col'>
                <span className='text-[12px] font-semibold'>
                  {detectionError ? 'Detection Error' : 'Detection Result'}
                </span>
                {detectionResult && (
                  <span className='text-[11px] opacity-70 font-mono'>
                    {detectionResult.label} {Math.round(detectionResult.confidence * 100)}% {detectionResult.inferenceMs}ms
                  </span>
                )}
                {detectionError && (
                  <span className='text-[11px] font-mono'>{detectionError}</span>
                )}
              </div>
            </div>
            {detectionResult && (
              <button
                onClick={() => setDetectionResult(null)}
                className='text-xs text-slate-500 hover:text-slate-700 font-medium'
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div className='flex-1 flex flex-col items-center justify-center py-2'>
          <div className='flex items-center gap-6'>
            <button
              onClick={() => fileInputRef.current?.click()}
              className='w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer'
              title='Upload photo'
            >
              <Upload className='w-4.5 h-4.5' />
            </button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              capture='environment'
              className='hidden'
              onChange={handleFileUpload}
            />

            <button
              id='shutter-capture-button'
              onClick={handleCapture}
              disabled={isCapturing || isDetecting}
              className='group relative w-18 h-18 rounded-full bg-white p-1.5 shadow-lg border-2 border-slate-200 active:scale-95 transition-transform cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
              aria-label='Capture Evidence'
            >
              <div className='w-full h-full rounded-full bg-[#00A3B4] group-hover:bg-[#008D9B] flex items-center justify-center text-white shadow-inner transition-colors'>
                {isCapturing || isDetecting ? (
                  <Loader2 className='w-7 h-7 stroke-[2] animate-spin' />
                ) : (
                  <Camera className='w-7 h-7 stroke-[2]' />
                )}
              </div>
            </button>

            <button
              onClick={() => handlePresetChange((selectedPresetIndex + 1) % CYLINDER_PRESETS.length)}
              className='w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer'
              title='Cycle preset'
            >
              <RefreshCw className='w-4.5 h-4.5' />
            </button>
          </div>
          <span className='text-[11px] text-slate-600 font-mono mt-2'>
            Tap shutter to capture live evidence with local reference comparison
          </span>
        </div>
      </div>

      <BottomNav currentScreen='home' onNavigate={onNavigate} />
    </div>
  );
};
