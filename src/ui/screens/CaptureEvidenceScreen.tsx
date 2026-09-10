import React, { useState, useRef, useEffect } from 'react';
import { AppScreen, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { CylinderGraphic } from '../components/CylinderGraphic';
import { CYLINDER_PRESETS } from '../data/mockData';
import { Zap, ZapOff, Scan, Camera, Info, Upload, Video, RefreshCw } from 'lucide-react';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activePreset = CYLINDER_PRESETS[selectedPresetIndex];

  // Optional Webcam handling
  const toggleWebcam = async () => {
    if (isWebcamActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsWebcamActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsWebcamActive(true);
      } catch (err) {
        console.warn('Webcam permission not granted or unavailable:', err);
        alert('Webcam access was not granted. Using authentic high-resolution cylinder simulation.');
      }
    }
  };

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    setIsCapturing(true);

    // Save selected preset & simulated outcome to session
    setSession((prev) => ({
      ...prev,
      selectedPreset: activePreset,
      outcome: activePreset.simulatedOutcome,
      capturedImage: activePreset.imageUrl,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSession((prev) => ({
        ...prev,
        capturedImage: url,
      }));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Capture Evidence"
        showBack={true}
        onBack={() => onNavigate('home')}
        showBell={false}
      />

      <div className="flex-1 flex flex-col px-4 pt-2 pb-3 space-y-3 overflow-y-auto">
        {/* Scenario quick selector banner for easy evaluation */}
        <div className="flex items-center justify-between px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="text-[11px] font-bold text-slate-500 font-mono">SCENARIO:</span>
          <div className="flex gap-1">
            {CYLINDER_PRESETS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(i)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedPresetIndex === i
                    ? 'bg-[#00A3B4] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
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

        {/* Camera Viewfinder Box matching Image 1 */}
        <div className="relative w-full aspect-[4/4.6] bg-black rounded-2xl overflow-hidden shadow-md flex items-center justify-center">
          {/* Flash Effect on capture */}
          {isCapturing && (
            <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />
          )}

          {/* Flashlight active overlay */}
          {isFlashOn && (
            <div className="absolute inset-0 bg-amber-100/15 pointer-events-none z-20" />
          )}

          {/* Video or Simulated High-Res Cylinder */}
          {isWebcamActive ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4 bg-[#6c6764]">
              {/* Authentic Photo / Vector rendering of the reference cylinder */}
              <div className="w-full h-full max-w-[280px] max-h-[340px] flex items-center justify-center">
                <CylinderGraphic
                  variant={
                    activePreset.simulatedOutcome === 'clarity'
                      ? 'blurred'
                      : activePreset.brand === 'HP Gas'
                      ? 'orange'
                      : 'red'
                  }
                  label={activePreset.brand.toUpperCase()}
                  showStamps={true}
                />
              </div>
            </div>
          )}

          {/* Scanning alignment reticle matching Image 1 */}
          {showGrid && (
            <div className="absolute inset-3 border-2 border-dashed border-white/75 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-3 z-20">
              {/* "Align Cylinder Here" Pill */}
              <div className="mt-1 px-4 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[12px] font-semibold tracking-wide border border-white/20 shadow-xs">
                Align Cylinder Here
              </div>

              {/* Scanning laser guide beam */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-scan absolute left-0" />

              <div />
            </div>
          )}

          {/* Top Right Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-30">
            {/* Flash button */}
            <button
              id="camera-flash-toggle"
              onClick={() => setIsFlashOn(!isFlashOn)}
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md ${
                isFlashOn
                  ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-300'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Toggle Flash"
            >
              {isFlashOn ? <Zap className="w-4.5 h-4.5 fill-current" /> : <ZapOff className="w-4.5 h-4.5" />}
            </button>

            {/* Framing reticle toggle */}
            <button
              id="camera-grid-toggle"
              onClick={() => setShowGrid(!showGrid)}
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md ${
                showGrid
                  ? 'bg-white/90 text-slate-900'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Toggle Alignment Guides"
            >
              <Scan className="w-4.5 h-4.5" />
            </button>

            {/* Webcam / Live Video Toggle */}
            <button
              id="camera-webcam-toggle"
              onClick={toggleWebcam}
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md ${
                isWebcamActive
                  ? 'bg-teal-500 text-white'
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
              title="Live Webcam"
            >
              <Video className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Guidance Callout Box matching Image 1 */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-3 shadow-2xs">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[#008D9B] mt-0.5">
            <Info className="w-4.5 h-4.5" />
          </div>
          <p className="text-[13px] text-slate-700 leading-snug">
            Ensure the cylinder is upright and the top valve is clearly visible within the frame.
          </p>
        </div>

        {/* Action area with Shutter Camera Button matching Image 1 */}
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          <div className="flex items-center gap-6">
            {/* Upload alternative */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Upload photo"
            >
              <Upload className="w-4.5 h-4.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Concentric Dual-Ring Shutter Button */}
            <button
              id="shutter-capture-button"
              onClick={handleCapture}
              className="group relative w-18 h-18 rounded-full bg-white p-1.5 shadow-lg border-2 border-slate-200 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
              aria-label="Capture Evidence"
            >
              <div className="w-full h-full rounded-full bg-[#00A3B4] group-hover:bg-[#008D9B] flex items-center justify-center text-white shadow-inner transition-colors">
                <Camera className="w-7 h-7 stroke-[2]" />
              </div>
            </button>

            {/* Refresh / Next preset */}
            <button
              onClick={() => handlePresetChange((selectedPresetIndex + 1) % CYLINDER_PRESETS.length)}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Cycle preset"
            >
              <RefreshCw className="w-4.5 h-4.5" />
            </button>
          </div>
          <span className="text-[11px] text-slate-600 font-mono mt-2">
            Tap shutter to capture live evidence
          </span>
        </div>
      </div>

      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
