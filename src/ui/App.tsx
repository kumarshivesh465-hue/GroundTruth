import { useEffect, useState } from "react";
import { AppScreen, VerificationSession } from "./types";
import { DEFAULT_SESSION } from "./data/mockData";
import { NotificationModal } from "./components/NotificationModal";
import { ManualModal } from "./components/ManualModal";

// Screens
import { HomeScreen } from "./screens/HomeScreen";
import { CaptureEvidenceScreen } from "./screens/CaptureEvidenceScreen";
import { RecordClaimScreen } from "./screens/RecordClaimScreen";
import { AcousticCheckScreen } from "./screens/AcousticCheckScreen";
import { CalibrationScreen } from "./screens/CalibrationScreen";
import { DatasetCaptureScreen } from "./screens/DatasetCaptureScreen";
import { TapCheckScreen } from "./screens/TapCheckScreen";
import { TapCalibrationScreen } from "./screens/TapCalibrationScreen";
import { ReviewEvidenceScreen } from "./screens/ReviewEvidenceScreen";
import { AnalysisScreen } from "./screens/AnalysisScreen";
import { ResultMatchScreen } from "./screens/ResultMatchScreen";
import { ResultMismatchScreen } from "./screens/ResultMismatchScreen";
import { ResultClarityScreen } from "./screens/ResultClarityScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { VesselTrendScreen } from "./screens/VesselTrendScreen";
import { referenceSessionEvidence } from "../datatap.js";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    // Deep-link support (?screen=result-match) so every screen is reachable/testable by URL
    const param = new URLSearchParams(window.location.search).get("screen");
    return (param as AppScreen) || "home";
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [session, setSession] = useState<VerificationSession>(DEFAULT_SESSION);

  useEffect(() => {
    let active = true;
    void referenceSessionEvidence().then((evidence) => {
      if (active && evidence) setSession((previous) => ({ ...previous, tapEvidence: evidence }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case "home":
        return (
          <HomeScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            session={session}
            setSession={setSession}
          />
        );
      case "capture":
        return (
          <CaptureEvidenceScreen
            onNavigate={setCurrentScreen}
            session={session}
            setSession={setSession}
          />
        );
      case "record-claim":
        return (
          <RecordClaimScreen
            onNavigate={setCurrentScreen}
            session={session}
            setSession={setSession}
          />
        );
      case "acoustic-check":
        return (
          <AcousticCheckScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            session={session}
            setSession={setSession}
          />
        );
      case "calibration":
        return (
          <CalibrationScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        );
      case "dataset-capture":
        return (
          <DatasetCaptureScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        );
      case "tap-check":
        return (
          <TapCheckScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            session={session}
            setSession={setSession}
          />
        );
      case "tap-calibration":
        return (
          <TapCalibrationScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        );
      case "review-evidence":
        return (
          <ReviewEvidenceScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            session={session}
            setSession={setSession}
          />
        );
      case "ai-analysis":
        return (
          <AnalysisScreen
            onNavigate={setCurrentScreen}
            session={session}
          />
        );
      case "result-match":
        return (
          <ResultMatchScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            session={session}
          />
        );
      case "result-mismatch":
        return (
          <ResultMismatchScreen
            onNavigate={setCurrentScreen}
            session={session}
          />
        );
      case "result-clarity":
        return (
          <ResultClarityScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            session={session}
          />
        );
      case "vessel-trend":
        return (
          <VesselTrendScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            session={session}
          />
        );
      case "history":
        return (
          <HistoryScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            setSession={setSession}
          />
        );
      default:
        return (
          <HomeScreen
            onNavigate={setCurrentScreen}
            onOpenNotifications={() => setIsNotificationOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            session={session}
            setSession={setSession}
          />
        );
    }
  };

  return (
    <main className="relative min-h-screen font-sans bg-slate-100">
      {/* Global Modals */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <ManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {renderActiveScreen()}
    </main>
  );
}
