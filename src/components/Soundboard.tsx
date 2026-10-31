/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Lowrider Streamer Soundboard & TikTok Gift Drops
 */

import React, { useState } from 'react';
import { DJEngine } from '../audio/DJEngine';
import { Radio, Zap, Volume2, Gift } from 'lucide-react';

interface SoundboardProps {
  engine: DJEngine;
}

interface DropItem {
  id: string;
  label: string;
  sub: string;
  category: 'lowrider' | 'slowjam' | 'bass' | 'hype';
  color: string;
}

const DROPS: DropItem[] = [
  {
    id: 'airhorn',
    label: 'AIRHORN BLAST',
    sub: '3x Reggae Club Horn',
    category: 'hype',
    color: 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25',
  },
  {
    id: 'lowrider_horn',
    label: 'LOWRIDER HORN',
    sub: '64 Impala Dual Klaxon',
    category: 'lowrider',
    color: 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25',
  },
  {
    id: 'hydraulic_pop',
    label: 'HYDRAULIC POP',
    sub: 'Switch Clank + Air Hiss',
    category: 'lowrider',
    color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/25',
  },
  {
    id: 'sub_boom',
    label: '808 SUB DROP',
    sub: 'Deep Trunk Rattler',
    category: 'bass',
    color: 'bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/25',
  },
  {
    id: 'westcoast_whistle',
    label: 'G-FUNK WHISTLE',
    sub: 'West Coast Sine Lead',
    category: 'lowrider',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25',
  },
  {
    id: 'chimes_sweep',
    label: '90s WIND CHIMES',
    sub: 'Slow Jam Wind Chimes',
    category: 'slowjam',
    color: 'bg-pink-500/15 text-pink-300 border-pink-500/40 hover:bg-pink-500/25',
  },
  {
    id: 'chopped_slowdown',
    label: 'SCREWED DROP',
    sub: 'Houston Tape Slowdown',
    category: 'bass',
    color: 'bg-violet-500/15 text-violet-300 border-violet-500/40 hover:bg-violet-500/25',
  },
  {
    id: 'money_cash',
    label: '$$ CASH REGISTER',
    sub: 'TikTok Gift Coin Ching',
    category: 'hype',
    color: 'bg-teal-500/15 text-teal-300 border-teal-500/40 hover:bg-teal-500/25',
  },
  {
    id: 'rewind',
    label: 'VINYL BACKSPIN',
    sub: 'Turntable Pull Up',
    category: 'bass',
    color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25',
  },
  {
    id: 'scratch_chirp',
    label: 'SCRATCH CHIRP',
    sub: 'Fast Crossfader Cut',
    category: 'bass',
    color: 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25',
  },
  {
    id: 'damn_vocal',
    label: 'DAMN! VOCAL',
    sub: 'Live Stream Hype Shout',
    category: 'hype',
    color: 'bg-orange-500/15 text-orange-300 border-orange-500/40 hover:bg-orange-500/25',
  },
  {
    id: 'censor_bleep',
    label: '1kHz CLEAN BLEEP',
    sub: 'Radio Edit Safe Drop',
    category: 'hype',
    color: 'bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25',
  },
];

export const Soundboard: React.FC<SoundboardProps> = ({ engine }) => {
  const [filterCat, setFilterCat] = useState<'all' | 'lowrider' | 'slowjam' | 'bass' | 'hype'>('all');

  const triggerDrop = (id: string) => {
    engine.triggerSoundboard(id);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        // ignore
      }
    }
  };

  const visibleDrops =
    filterCat === 'all' ? DROPS : DROPS.filter((d) => d.category === filterCat);

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl relative overflow-hidden">
      {/* Top Chrome Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background:
            'linear-gradient(90deg, #94a3b8 0%, #f59e0b 35%, #ef4444 65%, #94a3b8 100%)',
        }}
      />

      {/* Header & Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-xs font-black text-slate-950">
            $$
          </div>
          <h3 className="text-xs font-bold text-slate-100 tracking-wide">
            LOWRIDER &amp; STREAM SOUNDBITE PAD
          </h3>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: 'all', label: 'All (12)' },
              { id: 'lowrider', label: 'Lowrider' },
              { id: 'slowjam', label: '90s Chimes' },
              { id: 'bass', label: '808/Scratch' },
              { id: 'hype', label: 'Hype' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap ${
                filterCat === cat.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Soundbite Pitch & Volume Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-amber-400 whitespace-nowrap">
            PITCH: {Math.round(engine.soundboardPitch * 100)}%
          </span>
          <input
            type="range"
            min={0.65}
            max={1.4}
            step={0.05}
            value={engine.soundboardPitch}
            onChange={(e) => {
              engine.soundboardPitch = parseFloat(e.target.value);
              engine.notifyUpdate();
            }}
            className="dj-slider flex-1 h-4"
          />
          <button
            onClick={() => {
              engine.soundboardPitch = 1.0;
              engine.notifyUpdate();
            }}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
          >
            1.0x
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
            GAIN: {Math.round(engine.soundboardVolume * 100)}%
          </span>
          <input
            type="range"
            min={0.2}
            max={1.2}
            step={0.05}
            value={engine.soundboardVolume}
            onChange={(e) => {
              engine.soundboardVolume = parseFloat(e.target.value);
              engine.notifyUpdate();
            }}
            className="dj-slider flex-1 h-4"
          />
        </div>
      </div>

      {/* 12 Sound Bites Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visibleDrops.map((drop) => (
          <button
            key={drop.id}
            onClick={() => triggerDrop(drop.id)}
            className={`h-14 rounded-xl border px-2.5 py-1.5 flex flex-col justify-center items-start transition-transform active:scale-95 shadow-sm text-left ${drop.color}`}
          >
            <div className="text-[11px] font-black tracking-tight leading-tight truncate w-full">
              {drop.label}
            </div>
            <div className="text-[9px] opacity-75 font-mono truncate w-full mt-0.5">
              {drop.sub}
            </div>
          </button>
        ))}
      </div>

      {/* TikTok Live Gift Alert + Soundbite Triggers */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
          <Gift className="w-3.5 h-3.5 text-rose-400" />
          <span>TIKTOK GIFT ALERT + DROP:</span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'rose', label: '🌹 Rose' },
              { id: 'money_gun', label: '💵 Cash Gun' },
              { id: 'lowrider_hop', label: '🛞 100-Spoke Hop' },
              { id: 'galaxy', label: '🌌 Galaxy' },
              { id: 'lion', label: '🦁 Lion' },
            ] as const
          ).map((g) => (
            <button
              key={g.id}
              onClick={() => engine.triggerTikTokGiftAlert(g.id)}
              className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 transition-colors whitespace-nowrap"
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
