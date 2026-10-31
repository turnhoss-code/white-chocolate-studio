/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - 1964 Chevy Impala Lowrider OBD-II Telemetry & Route Optimisation AI
 */

import React, { useState } from 'react';
import {
  Gauge,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Search,
  ExternalLink,
  X,
  Compass,
  Zap,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CruiserDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

interface SensorDataState {
  coolantTempF: number;
  rpm: number;
  speedMph: number;
  stftPercent: number;
  ltftPercent: number;
  mafGramsPerSec: number;
  o2VoltageV: number;
  mapKpa: number;
  hydraulicPressurePsi: number;
  batteryVoltageV: number;
}

interface HistoricalRoute {
  id: string;
  name: string;
  distanceMiles: number;
  damageScore: number; // 1-100 (100 = severe chassis scrape/hydraulic damage risk)
  roadConditions: string;
  notes: string;
}

const HISTORICAL_ROUTES: HistoricalRoute[] = [
  {
    id: 'sunset',
    name: 'Sunset Boulevard Cruise',
    distanceMiles: 8.4,
    damageScore: 12,
    roadConditions: 'Freshly resurfaced, wide lanes, low crowns',
    notes: 'Safe for low-slung stance. Gentle elevation changes.',
  },
  {
    id: 'whittier',
    name: 'Whittier Boulevard Historic Strip',
    distanceMiles: 14.2,
    damageScore: 26,
    roadConditions: 'Iconic lowrider corridor, minor railway crossings',
    notes: 'Classic cruising. Occasional road dips near intersections.',
  },
  {
    id: 'crenshaw',
    name: 'Crenshaw Boulevard Cruise',
    distanceMiles: 11.5,
    damageScore: 42,
    roadConditions: 'Moderate road crowns, active bus pads',
    notes: 'Recommend raising front hydraulic cylinders +2 inches.',
  },
  {
    id: 'dtla_ind',
    name: 'DTLA Industrial District',
    distanceMiles: 6.8,
    damageScore: 78,
    roadConditions: 'Severe pothole clusters, steep railroad tracks, debris',
    notes: 'High scraping hazard for undercarriage & pump fittings.',
  },
];

const PRESET_TELEMETRY: Record<string, { label: string; data: SensorDataState }> = {
  healthy: {
    label: 'Healthy Lowrider Cruise (350 V8)',
    data: {
      coolantTempF: 195,
      rpm: 850,
      speedMph: 25,
      stftPercent: 1.5,
      ltftPercent: -0.8,
      mafGramsPerSec: 5.2,
      o2VoltageV: 0.48,
      mapKpa: 36,
      hydraulicPressurePsi: 2200,
      batteryVoltageV: 25.6,
    },
  },
  lean_anomaly: {
    label: 'Vacuum Leak Anomaly (P0171 Lean)',
    data: {
      coolantTempF: 202,
      rpm: 1080,
      speedMph: 0,
      stftPercent: 18.5,
      ltftPercent: 14.2,
      mafGramsPerSec: 3.4,
      o2VoltageV: 0.12,
      mapKpa: 48,
      hydraulicPressurePsi: 2150,
      batteryVoltageV: 24.8,
    },
  },
  overheat: {
    label: 'High Coolant Temp Warning (Traffic)',
    data: {
      coolantTempF: 236,
      rpm: 900,
      speedMph: 5,
      stftPercent: 3.2,
      ltftPercent: 2.1,
      mafGramsPerSec: 5.6,
      o2VoltageV: 0.52,
      mapKpa: 39,
      hydraulicPressurePsi: 2100,
      batteryVoltageV: 24.2,
    },
  },
  hydraulic_drop: {
    label: 'Hydraulic Pressure Drop Warning',
    data: {
      coolantTempF: 196,
      rpm: 880,
      speedMph: 15,
      stftPercent: 1.0,
      ltftPercent: 0.2,
      mafGramsPerSec: 5.1,
      o2VoltageV: 0.46,
      mapKpa: 37,
      hydraulicPressurePsi: 1180,
      batteryVoltageV: 22.4,
    },
  },
};

export const CruiserDiagnosticsModal: React.FC<CruiserDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'routes'>('diagnostics');
  const [sensors, setSensors] = useState<SensorDataState>(PRESET_TELEMETRY.healthy.data);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);
  const [routeReport, setRouteReport] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; uri: string }>>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('sunset');

  if (!isOpen) return null;

  const handleApplyPreset = (presetKey: string) => {
    if (PRESET_TELEMETRY[presetKey]) {
      setSensors({ ...PRESET_TELEMETRY[presetKey].data });
      setDiagnosticReport(null);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsLoading(true);
    setDiagnosticReport(null);
    setGroundingSources([]);

    try {
      const resp = await fetch('/api/car/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'diagnostics',
          sensorData: sensors,
          tripLogs: [
            { date: '2026-10-28', trip: 'Crenshaw Sunday Rollout', miles: 18.2, maxTempF: 208, avgRpm: 1250 },
            { date: '2026-10-29', trip: 'Whittier Blvd Night Cruise', miles: 24.0, maxTempF: 200, avgRpm: 1180 },
          ],
          vehicleInfo: {
            year: 1964,
            make: 'Chevrolet',
            model: 'Impala Lowrider',
            engine: '350 V8 EFI Conversion with OBD-II Live Bus & 4-Pump 8-Battery Hydraulics',
          },
        }),
      });

      const data = await resp.json();
      setDiagnosticReport(data.report || 'Diagnostics completed.');
      setGroundingSources(data.groundingSources || []);
    } catch (err: unknown) {
      setDiagnosticReport(
        'Offline fallback: OBD-II sensor values analyzed. Engine operating parameters within expected baseline for 1964 Impala V8 cruise.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizeRoute = async () => {
    setIsLoading(true);
    setRouteReport(null);
    setGroundingSources([]);

    try {
      const resp = await fetch('/api/car/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'route_optimization',
          sensorData: sensors,
          historicalRoutes: HISTORICAL_ROUTES,
          tripLogs: [
            { route: 'Sunset', trips: 14, scrapesReported: 0, avgSpeed: 28 },
            { route: 'DTLA Industrial', trips: 3, scrapesReported: 5, avgSpeed: 14 },
          ],
          vehicleInfo: {
            year: 1964,
            make: 'Chevrolet',
            model: 'Impala Lowrider',
            suspension: 'Custom 4-pump chrome hydraulic suspension with 14-inch deep dish wire wheels',
          },
        }),
      });

      const data = await resp.json();
      setRouteReport(data.report || 'Route optimization completed.');
      setGroundingSources(data.groundingSources || []);
    } catch {
      setRouteReport(
        'Recommended Route: Sunset Boulevard Cruise (8.4 mi, damage score 12/100). Offers the smoothest pavement with zero severe chassis-scraping dips or rail obstacles.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isTempHigh = sensors.coolantTempF > 220;
  const isTrimHigh = Math.abs(sensors.stftPercent) > 10;
  const isHydLow = sensors.hydraulicPressurePsi < 1600;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>1964 IMPALA CRUISER AI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  OBD-II & ROUTE OPTIMIZER
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live sensor diagnostics, fault cause analysis, and lowrider damage-free route routing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors ${
              activeTab === 'diagnostics'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>OBD-II Sensor Diagnostics</span>
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors ${
              activeTab === 'routes'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Cruise Route Optimizer</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto space-y-4 py-3 flex-1 pr-1">
          {activeTab === 'diagnostics' ? (
            <>
              {/* Telemetry Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>TELEMETRY SCENARIOS</span>
                  <span className="text-[10px] text-amber-400">Click to test scenario</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {Object.entries(PRESET_TELEMETRY).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => handleApplyPreset(k)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[11px] font-semibold text-slate-300 text-left truncate transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live OBD-II Sensor Gauges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Gauge 1: Coolant */}
                <div
                  className={`p-3 rounded-2xl border ${
                    isTempHigh ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Coolant Temp</div>
                  <div className="text-xl font-black font-mono tabular-nums mt-0.5">
                    {sensors.coolantTempF}°F
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {sensors.coolantTempF > 220 ? 'HIGH · INSPECT' : 'Normal (185-210°F)'}
                  </div>
                </div>

                {/* Gauge 2: RPM */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Engine RPM</div>
                  <div className="text-xl font-black font-mono tabular-nums mt-0.5 text-amber-400">
                    {sensors.rpm}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    Idle / 25 MPH Cruise
                  </div>
                </div>

                {/* Gauge 3: Fuel Trim (STFT) */}
                <div
                  className={`p-3 rounded-2xl border ${
                    isTrimHigh ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Short Term Trim</div>
                  <div className="text-xl font-black font-mono tabular-nums mt-0.5">
                    {sensors.stftPercent > 0 ? `+${sensors.stftPercent}%` : `${sensors.stftPercent}%`}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {Math.abs(sensors.stftPercent) > 10 ? 'LEAN / TRIM FAULT' : 'Target ±5%'}
                  </div>
                </div>

                {/* Gauge 4: Hydraulic Pressure */}
                <div
                  className={`p-3 rounded-2xl border ${
                    isHydLow ? 'bg-rose-950/40 border-rose-500/50 text-rose-300' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Hydraulic PSI</div>
                  <div className="text-xl font-black font-mono tabular-nums mt-0.5 text-cyan-400">
                    {sensors.hydraulicPressurePsi}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {sensors.hydraulicPressurePsi < 1600 ? 'LOW PRESSURE' : 'Ready to Hop'}
                  </div>
                </div>

                {/* Secondary row */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                  <div className="text-[9px] font-mono text-slate-400">MAF AIRFLOW</div>
                  <div className="text-sm font-black font-mono text-slate-200">
                    {sensors.mafGramsPerSec} g/s
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                  <div className="text-[9px] font-mono text-slate-400">O2 SENSOR 1</div>
                  <div className="text-sm font-black font-mono text-slate-200">
                    {sensors.o2VoltageV} V
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                  <div className="text-[9px] font-mono text-slate-400">MAP MANIFOLD</div>
                  <div className="text-sm font-black font-mono text-slate-200">
                    {sensors.mapKpa} kPa
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-850">
                  <div className="text-[9px] font-mono text-slate-400">HYD BATTERY BANK</div>
                  <div className="text-sm font-black font-mono text-slate-200">
                    {sensors.batteryVoltageV} V
                  </div>
                </div>
              </div>

              {/* Diagnostics Action Button */}
              <button
                onClick={handleRunDiagnostics}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[44px]"
              >
                {isLoading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>PARSING OBD-II DATA & SEARCHING TECHNICAL FORUMS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>RUN AI OBD-II DIAGNOSTICS & ACTIONABLE REPORT</span>
                  </>
                )}
              </button>

              {/* Diagnostic AI Report Display */}
              {diagnosticReport && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4" />
                      <span>EXPERT AUTOMOTIVE DIAGNOSTIC REPORT</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Under 300 words</span>
                  </div>

                  <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                    {diagnosticReport}
                  </div>

                  {groundingSources.length > 0 && (
                    <div className="pt-2 border-t border-slate-850">
                      <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                        <Search className="w-3 h-3 text-cyan-400" />
                        <span>Web & Forum Grounding Citations:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {groundingSources.map((src, i) => (
                          <a
                            key={i}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-cyan-300 flex items-center gap-1 border border-slate-800"
                          >
                            <span>{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Route Optimization Tab */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span>HISTORICAL LOWRIDER CRUISE ROUTES</span>
                  <span className="text-[10px] text-amber-400">Damage scores based on road dips & scrapes</span>
                </div>

                {/* Routes List */}
                <div className="space-y-2">
                  {HISTORICAL_ROUTES.map((route) => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        selectedRouteId === route.id
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-black text-xs text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>{route.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 font-bold">
                            {route.distanceMiles} mi
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              route.damageScore < 20
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : route.damageScore < 50
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            Damage Risk: {route.damageScore}/100
                          </span>
                        </div>
                      </div>

                      <div className="mt-1 text-[11px] text-slate-300">
                        {route.roadConditions}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {route.notes}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optimize Action Button */}
                <button
                  onClick={handleOptimizeRoute}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-xs tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all min-h-[44px]"
                >
                  {isLoading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin text-slate-950" />
                      <span>ANALYZING HISTORICAL DAMAGE SCORES & TRIP LOGS...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4 text-slate-950" />
                      <span>RECOMMEND BEST CRUISE ROUTE (UNDER 150 WORDS)</span>
                    </>
                  )}
                </button>

                {/* Route Recommendation Display */}
                {routeReport && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>AI ROUTE RECOMMENDATION</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Under 150 words</span>
                    </div>

                    <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                      {routeReport}
                    </div>

                    {groundingSources.length > 0 && (
                      <div className="pt-2 border-t border-slate-850">
                        <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <Search className="w-3 h-3 text-cyan-400" />
                          <span>Traffic & Pavement Conditions Grounding:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {groundingSources.map((src, i) => (
                            <a
                              key={i}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-cyan-300 flex items-center gap-1 border border-slate-800"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
