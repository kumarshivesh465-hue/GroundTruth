import React, { useEffect, useMemo, useState } from 'react';
import { AppScreen, ConsumptionPrediction, ShapeDriftResult, VerificationSession } from '../types';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { TrendingDown, AlertTriangle, CheckCircle2, Gauge, Mail, Info, RefreshCw } from 'lucide-react';
import { getTapHistory, tapHistoryAsReadings, detectShapeDrift } from '../../tap-store.js';
import { predictTimeToEmpty, describePrediction } from '../../consumption.js';
import { buildManagerAlert } from '../../provider-email';

interface VesselTrendScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onOpenNotifications: () => void;
  session: VerificationSession;
}

/**
 * Consumption trend, time-to-empty forecast, and contamination screen.
 *
 * Every number here is a screening estimate from a small number of tap
 * readings. The page says so next to the numbers rather than in a footnote,
 * because a forecast presented as a measurement is the failure mode that
 * would make this tool dangerous.
 */
export const VesselTrendScreen: React.FC<VesselTrendScreenProps> = ({ onNavigate, onOpenNotifications, session }) => {
  const [readings, setReadings] = useState<any[]>([]);
  const [drift, setDrift] = useState<ShapeDriftResult | null>(null);
  const [loading, setLoading] = useState(true);
  const vesselId = session.vesselId || session.cylinderUid || null;

  const load = async () => {
    setLoading(true);
    try {
      const history = await getTapHistory();
      setReadings(tapHistoryAsReadings(history, vesselId));
      setDrift(detectShapeDrift(history, vesselId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [vesselId]);

  const prediction: ConsumptionPrediction = useMemo(
    () => predictTimeToEmpty(readings) as ConsumptionPrediction,
    [readings]
  );

  const chartPoints = readings.map((reading, index) => {
    const x = readings.length > 1 ? (index / (readings.length - 1)) * 100 : 50;
    const y = 100 - reading.percent;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  const handleDraftAlert = () => {
    const draft = buildManagerAlert(prediction, session, { recipient: session.provider?.recipientEmail || '' });
    window.location.href = draft.mailto;
  };

  const ok = prediction.status === 'ok';
  const driftFlagged = drift?.status === 'drift';

  return (
    <div className="flex-1 flex flex-col bg-white select-none">
      <TopAppBar
        title="Vessel Trend"
        showBack
        onBack={() => onNavigate('home')}
        showBell
        hasUnreadNotifications
        onBellClick={onOpenNotifications}
      />
      <div className="flex-1 px-5 py-3 space-y-3.5 overflow-y-auto">
        <div className="space-y-1">
          <h2 className="text-[21px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Consumption and forecast</h2>
          <p className="text-[13px] text-slate-600 leading-snug">
            Built from repeated tap checks on <span className="font-semibold text-slate-700">{vesselId || 'this vessel'}</span>. A single tap cannot give a rate: that needs a series of readings over time.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase font-mono text-slate-600"><Gauge className="w-4 h-4 text-[#00A3B4]" />Fill over time</span>
            <button onClick={() => void load()} className="text-[11px] font-semibold text-[#00A3B4] flex items-center gap-1 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
          </div>
          {loading ? (
            <p className="text-xs text-slate-500">Loading readings...</p>
          ) : readings.length === 0 ? (
            <p className="text-xs text-slate-600 leading-snug">No usable level readings yet for this vessel. Run tap checks over several days; each confident tap becomes one point on this line.</p>
          ) : (
            <div className="space-y-2">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32 rounded-xl bg-slate-50 border border-slate-200">
                <line x1="0" y1="100" x2="100" y2="100" stroke="#e2e8f0" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="0" y1="0" x2="100" y2="0" stroke="#e2e8f0" strokeWidth="0.5" />
                {readings.length > 1 && <polyline points={chartPoints} fill="none" stroke="#00A3B4" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                {readings.map((reading, index) => {
                  const x = readings.length > 1 ? (index / (readings.length - 1)) * 100 : 50;
                  const y = 100 - reading.percent;
                  return <circle key={reading.id || index} cx={x} cy={y} r="2.5" fill="#00A3B4" vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>OLDEST</span>
                <span>{readings.length} reading{readings.length === 1 ? '' : 's'}</span>
                <span>LATEST</span>
              </div>
            </div>
          )}
        </div>

        <div className={`rounded-2xl border p-4 space-y-2.5 ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2">
            {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-700" /> : <AlertTriangle className="w-5 h-5 text-amber-700" />}
            <span className="text-sm font-bold text-slate-900">{ok ? 'Time to empty' : 'Forecast not available'}</span>
          </div>
          {ok ? (
            <div className="space-y-1">
              <div className="flex items-end gap-2">
                <span className="text-[34px] leading-none font-extrabold text-slate-900">{Math.round(prediction.daysToEmpty as number)}</span>
                <span className="pb-1.5 text-sm font-bold text-slate-600">days</span>
              </div>
              <p className="text-[12px] text-slate-700 leading-snug">
                95% range {Math.round(prediction.earliestDays as number)}-{Math.round(prediction.latestDays as number)} days, at about {(prediction.ratePerDay as number).toFixed(2)} fill-points per day.
              </p>
              {prediction.weakFit && (
                <p className="text-[11px] text-amber-800 leading-snug">The readings scatter widely, so treat this date as approximate. More readings will tighten it.</p>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-amber-900 leading-snug">{describePrediction(prediction)}</p>
          )}
          {prediction.refillsDetected && (
            <p className="text-[10px] text-slate-600 border-t border-slate-200/70 pt-2">A refill was detected in this history, so only the readings since then were used for the rate.</p>
          )}
        </div>

        <div className={`rounded-2xl border p-4 space-y-2 ${driftFlagged ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <TrendingDown className={`w-5 h-5 ${driftFlagged ? 'text-red-700' : 'text-slate-500'}`} />
            <span className="text-sm font-bold text-slate-900">Contamination / damage screen</span>
          </div>
          <p className="text-[12px] text-slate-700 leading-snug">{drift?.reason || 'Not enough history yet.'}</p>
          <p className="text-[10px] text-slate-500 leading-snug">
            Compares this vessel only against its own earlier taps. Two different cylinders legitimately ring differently, so a cross-vessel comparison would be meaningless. A flag is a reason to inspect, never a diagnosis.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-3.5 space-y-2">
          <span className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase font-mono text-slate-600"><Info className="w-4 h-4 text-slate-500" />What this is and is not</span>
          <ul className="text-[11px] text-slate-600 leading-snug space-y-1 list-disc pl-4">
            <li>An estimate from repeated screening taps, reported as a range, not a measurement.</li>
            <li>Not a weight, a certified volume, or a custody-transfer reading.</li>
            <li>Not a replacement for an installed gauge or a physical check.</li>
            <li>A forecast needs at least 10 readings spanning about a week before it is shown at all.</li>
          </ul>
        </div>

        <div className="pt-1 pb-1 space-y-2">
          <button
            onClick={handleDraftAlert}
            disabled={!ok}
            className="w-full h-12 rounded-xl bg-[#00A3B4] hover:bg-[#008D9B] disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Mail className="w-4.5 h-4.5" />Draft manager alert email
          </button>
          <p className="text-[10px] text-slate-500 text-center leading-snug">
            Opens your email app with a prepared draft. Nothing is sent by this app, and the recipient stays blank unless you set one.
          </p>
        </div>
      </div>
      <BottomNav currentScreen="home" onNavigate={onNavigate} />
    </div>
  );
};
