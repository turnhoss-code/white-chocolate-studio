/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Real-Time Lowrider DJ FX Rack & Filter Matrix
 */

import React from 'react';
import { DJEngine, FilterPresetId } from '../audio/DJEngine';
import { Waves, Sparkles, Flame, AudioWaveform, Disc, Sliders } from 'lucide-react';

interface FXRackProps {
  engine: DJEngine;
}

const PRESET_LIST: Array<{ id: FilterPresetId; label: string }> = [
  { id: 'bypass', label: 'Bypass' },
  { id: 'sub_boost', label: '808 Sub' },
  { id: 'velvet_warmth', label: '90s Warm' },
  { id: 'chopped_slow', label: 'Screwed' },
  { id: 'vocal_iso', label: 'Vocal Iso' },
  { id: 'club_riser', label: 'Club Riser' },
];

export const FXRack: React.FC<FXRackProps> = ({ engine }) => {
  const deckA = engine.deckAState;
  const deckB = engine.deckBState;

  const fxList = [
    { key: 'echo' as const, name: 'BEAT ECHO', icon: Waves, desc: '1/2 Beat Tape Delay' },
    { key: 'stutter' as const, name: 'CHOP STUTTER', icon: AudioWaveform, desc: '1/2 Beat Chop Loop' },
    { key: 'flanger' as const, name: 'CHROME FLANGE', icon: Disc, desc: 'West Coast Jet Sweep' },
    { key: 'distortion' as const, name: '808 GRIT', icon: Flame, desc: 'Harmonic Tube Drive' },
    { key: 'reverb' as const, name: 'VELVET REVERB', icon: Sparkles, desc: 'Slow Jam Hall Space' },
  ];

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl relative overflow-hidden">
      {/* Top Chrome Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background:
            'linear-gradient(90deg, #94a3b8 0%, #3b82f6 35%, #f59e0b 65%, #94a3b8 100%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800 pt-1">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-slate-100 tracking-wide">
            REAL-TIME DSP FX &amp; FILTER RACK
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          DUAL-DECK INDEPENDENT DSP
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Deck A FX & Filter Unit */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-400">DECK A FX &amp; FILTERS</span>
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
              {deckA.track?.title || 'Deck A'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {fxList.map((fx) => {
              const active = deckA.fx[fx.key];
              const Icon = fx.icon;

              return (
                <button
                  key={fx.key}
                  onClick={() => engine.toggleFX('A', fx.key)}
                  className={`p-2 rounded-xl border text-left transition-transform active:scale-95 flex flex-col justify-between h-16 ${
                    active
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-mono font-bold">
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold leading-tight">{fx.name}</div>
                    <div className="text-[8px] text-slate-400 font-mono truncate">{fx.desc}</div>
                  </div>
                </button>
              );
            })}

            {/* Resonance Q Control Card */}
            <div className="p-2 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between h-16">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>RES Q</span>
                <span className="text-amber-400 font-bold">{deckA.filterResonance.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.7}
                max={10}
                step={0.3}
                value={deckA.filterResonance}
                onChange={(e) => {
                  deckA.filterResonance = parseFloat(e.target.value);
                  engine.setFilter('A', deckA.filter);
                }}
                className="dj-slider w-full h-3"
              />
              <div className="text-[8px] text-slate-400 font-mono">Filter Bite</div>
            </div>
          </div>

          {/* Deck A Filter Presets */}
          <div className="pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-rose-400" />
                <span>FILTER MACRO</span>
              </span>
              <span className="text-rose-400 uppercase">{deckA.activeFilterPreset}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {PRESET_LIST.map((p) => (
                <button
                  key={p.id}
                  onClick={() => engine.applyFilterPreset('A', p.id)}
                  className={`py-1 rounded text-[10px] font-bold transition-colors ${
                    deckA.activeFilterPreset === p.id
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Deck B FX & Filter Unit */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-400">DECK B FX &amp; FILTERS</span>
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
              {deckB.track?.title || 'Deck B'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {fxList.map((fx) => {
              const active = deckB.fx[fx.key];
              const Icon = fx.icon;

              return (
                <button
                  key={fx.key}
                  onClick={() => engine.toggleFX('B', fx.key)}
                  className={`p-2 rounded-xl border text-left transition-transform active:scale-95 flex flex-col justify-between h-16 ${
                    active
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-mono font-bold">
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold leading-tight">{fx.name}</div>
                    <div className="text-[8px] text-slate-400 font-mono truncate">{fx.desc}</div>
                  </div>
                </button>
              );
            })}

            {/* Resonance Q Control Card */}
            <div className="p-2 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between h-16">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>RES Q</span>
                <span className="text-amber-400 font-bold">{deckB.filterResonance.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.7}
                max={10}
                step={0.3}
                value={deckB.filterResonance}
                onChange={(e) => {
                  deckB.filterResonance = parseFloat(e.target.value);
                  engine.setFilter('B', deckB.filter);
                }}
                className="dj-slider w-full h-3"
              />
              <div className="text-[8px] text-slate-400 font-mono">Filter Bite</div>
            </div>
          </div>

          {/* Deck B Filter Presets */}
          <div className="pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-blue-400" />
                <span>FILTER MACRO</span>
              </span>
              <span className="text-blue-400 uppercase">{deckB.activeFilterPreset}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {PRESET_LIST.map((p) => (
                <button
                  key={p.id}
                  onClick={() => engine.applyFilterPreset('B', p.id)}
                  className={`py-1 rounded text-[10px] font-bold transition-colors ${
                    deckB.activeFilterPreset === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
