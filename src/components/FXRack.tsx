/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Real-Time DJ FX Rack (Dark Studio Edition)
 */

import React from 'react';
import { DJEngine } from '../audio/DJEngine';
import { Waves, Sparkles, Flame, AudioWaveform, Disc } from 'lucide-react';

interface FXRackProps {
  engine: DJEngine;
  isDark?: boolean;
}

export const FXRack: React.FC<FXRackProps> = ({ engine, isDark = true }) => {
  const deckA = engine.deckAState;
  const deckB = engine.deckBState;

  const fxList = [
    { key: 'echo' as const, name: 'BEAT ECHO', icon: Waves, desc: '1/2 Beat Tape Echo' },
    { key: 'stutter' as const, name: 'STUTTER ROLL', icon: AudioWaveform, desc: 'Glitch Beat Repeater' },
    { key: 'flanger' as const, name: 'JET FLANGER', icon: Disc, desc: 'LFO Sweeping Phaser' },
    { key: 'distortion' as const, name: 'CRUSH / GRIT', icon: Flame, desc: 'Overdrive Clip Distortion' },
    { key: 'reverb' as const, name: 'SPACE REVERB', icon: Sparkles, desc: 'Deep Club Reverb' }
  ];

  const containerClasses = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-2xl'
    : 'bg-white/95 border-white text-slate-800 shadow-xl';

  const cardInnerA = isDark ? 'bg-slate-950/80 border-rose-900/30' : 'bg-rose-50/70 border-rose-200';
  const cardInnerB = isDark ? 'bg-slate-950/80 border-blue-900/30' : 'bg-sky-50/70 border-sky-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`${containerClasses} rounded-3xl border p-3.5 sm:p-4 backdrop-blur-md`}>
      {/* Header */}
      <div className={`flex items-center justify-between pb-2.5 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-600 flex items-center justify-center text-white shadow-md">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black leading-none">
              REAL-TIME DSP FX RACK
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono font-bold">
              DUAL-CHANNEL INDEPENDENT DSP
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Deck A FX Unit */}
        <div className={`${cardInnerA} p-3 rounded-2xl border shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-rose-500">DECK A FX</span>
            <span className={`text-[10px] ${textMutedClass} font-mono font-bold truncate max-w-[120px]`}>
              {deckA.track?.title || 'Deck A'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fxList.map((fx) => {
              const active = deckA.fx[fx.key];
              const Icon = fx.icon;

              return (
                <button
                  key={fx.key}
                  onClick={() => engine.toggleFX('A', fx.key)}
                  className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between h-18 shadow-sm ${
                    active
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-400/50'
                      : isDark
                      ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-mono font-bold">
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] font-black leading-tight">{fx.name}</div>
                    <div className={`text-[9px] font-mono truncate ${active ? 'text-rose-100' : textMutedClass}`}>
                      {fx.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Deck B FX Unit */}
        <div className={`${cardInnerB} p-3 rounded-2xl border shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-blue-400">DECK B FX</span>
            <span className={`text-[10px] ${textMutedClass} font-mono font-bold truncate max-w-[120px]`}>
              {deckB.track?.title || 'Deck B'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fxList.map((fx) => {
              const active = deckB.fx[fx.key];
              const Icon = fx.icon;

              return (
                <button
                  key={fx.key}
                  onClick={() => engine.toggleFX('B', fx.key)}
                  className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between h-18 shadow-sm ${
                    active
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400/50'
                      : isDark
                      ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-850'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-mono font-bold">
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[11px] font-black leading-tight">{fx.name}</div>
                    <div className={`text-[9px] font-mono truncate ${active ? 'text-blue-100' : textMutedClass}`}>
                      {fx.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
