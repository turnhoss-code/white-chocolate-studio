/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - TikTok Streamer Soundboard & Hype Drops (Dark Studio Edition)
 */

import React, { useState } from 'react';
import { DJEngine } from '../audio/DJEngine';
import { Sparkles, Zap, Mic } from 'lucide-react';
import { RecordedVoiceClip } from '../storage/studioStorage';

interface SoundboardProps {
  engine: DJEngine;
  onOpenVoiceSampler?: () => void;
  savedClips?: RecordedVoiceClip[];
  onTriggerCustomClip?: (clipId: string) => void;
  isDark?: boolean;
}

interface DropItem {
  id: string;
  label: string;
  icon: string;
  category: 'meme' | 'horn' | 'scratch' | 'vocal' | 'bass';
  darkColor: string;
  lightColor: string;
}

const ALL_TIKTOK_DROPS: DropItem[] = [
  // Viral TikTok Memes
  { id: 'vine_boom', label: 'VINE BOOM', icon: '💥', category: 'meme', darkColor: 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-800/70', lightColor: 'bg-purple-100 text-purple-900 border-purple-300' },
  { id: 'bruh', label: 'BRUH', icon: '🗿', category: 'meme', darkColor: 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-800/70', lightColor: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'emotional_damage', label: 'EMOTIONAL DAMAGE', icon: '💔', category: 'meme', darkColor: 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800/70', lightColor: 'bg-rose-100 text-rose-900 border-rose-300' },
  { id: 'oh_no', label: 'OH NO NO NO', icon: '🤣', category: 'meme', darkColor: 'bg-pink-950/60 hover:bg-pink-900/60 text-pink-300 border-pink-800/70', lightColor: 'bg-pink-100 text-pink-900 border-pink-300' },
  { id: 'ding_levelup', label: 'LEVEL UP / DING', icon: '🔔', category: 'meme', darkColor: 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/70', lightColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'crowd_cheer', label: 'HYPE CROWD CHEER', icon: '🗣️', category: 'vocal', darkColor: 'bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border-sky-800/70', lightColor: 'bg-sky-100 text-sky-900 border-sky-300' },
  { id: 'rizz_horn', label: 'RIZZ HORN', icon: '🎷', category: 'horn', darkColor: 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-800/70', lightColor: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  { id: 'sheesh', label: 'SHEEEESH', icon: '🌬️', category: 'vocal', darkColor: 'bg-teal-950/60 hover:bg-teal-900/60 text-teal-300 border-teal-800/70', lightColor: 'bg-teal-100 text-teal-900 border-teal-300' },
  { id: 'sad_violin', label: 'SAD VIOLIN MEME', icon: '🎻', category: 'meme', darkColor: 'bg-yellow-950/60 hover:bg-yellow-900/60 text-yellow-300 border-yellow-800/70', lightColor: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
  { id: 'fart_reverb', label: 'REVERB BOOM MEME', icon: '💨', category: 'bass', darkColor: 'bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 border-orange-800/70', lightColor: 'bg-orange-100 text-orange-900 border-orange-300' },

  // DJ & Streamer Classics
  { id: 'airhorn', label: 'AIRHORN BLAST', icon: '📢', category: 'horn', darkColor: 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border-red-800/70', lightColor: 'bg-red-100 text-red-900 border-red-300' },
  { id: 'lowrider_horn', label: 'LOWRIDER HORN', icon: '🚘', category: 'horn', darkColor: 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-800/70', lightColor: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'sub_boom', label: '808 SUB DROP', icon: '💣', category: 'bass', darkColor: 'bg-violet-950/60 hover:bg-violet-900/60 text-violet-300 border-violet-800/70', lightColor: 'bg-violet-100 text-violet-900 border-violet-300' },
  { id: 'record_scratch_freeze', label: 'RECORD SCRATCH', icon: '💿', category: 'scratch', darkColor: 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border-cyan-800/70', lightColor: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
  { id: 'rewind', label: 'TAPE REWIND', icon: '⏪', category: 'scratch', darkColor: 'bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border-blue-800/70', lightColor: 'bg-blue-100 text-blue-900 border-blue-300' },
  { id: 'money_cash', label: '$$ CASH DING', icon: '🤑', category: 'vocal', darkColor: 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/70', lightColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { id: 'laser', label: 'DUB LASERS', icon: '⚡', category: 'meme', darkColor: 'bg-lime-950/60 hover:bg-lime-900/60 text-lime-300 border-lime-800/70', lightColor: 'bg-lime-100 text-lime-900 border-lime-300' },
  { id: 'siren', label: 'HYPE SIREN', icon: '🚨', category: 'horn', darkColor: 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800/70', lightColor: 'bg-rose-100 text-rose-900 border-rose-300' },
];

export const Soundboard: React.FC<SoundboardProps> = ({
  engine,
  onOpenVoiceSampler,
  savedClips = [],
  onTriggerCustomClip,
  isDark = true,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const triggerDrop = (id: string) => {
    engine.triggerSoundboard(id);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  };

  const filteredDrops = filterCategory === 'all'
    ? ALL_TIKTOK_DROPS
    : ALL_TIKTOK_DROPS.filter((d) => d.category === filterCategory);

  const containerClasses = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-2xl'
    : 'bg-white/95 border-white text-slate-800 shadow-xl';

  const cardInnerClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`${containerClasses} rounded-3xl border p-3.5 sm:p-4 backdrop-blur-md`}>
      {/* Header */}
      <div className={`flex items-center justify-between pb-2.5 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-pink-600 flex items-center justify-center text-xs font-black text-white shadow-md">
            $$
          </div>
          <div>
            <h3 className="text-xs font-black flex items-center gap-1.5 leading-none">
              <span>TIKTOK VIRAL SOUNDBOARD</span>
            </h3>
            <span className="text-[10px] text-amber-400 font-mono font-bold">
              ALL POPULAR MEMES & CUSTOM SHOUTS
            </span>
          </div>
        </div>

        {/* Quick Voice Recording CTA */}
        <button
          onClick={onOpenVoiceSampler}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95 min-h-[36px]"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Record Voice FX</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className={`flex items-center gap-1 p-1 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'} rounded-2xl mb-3 overflow-x-auto border`}>
        {[
          { id: 'all', label: 'All Sounds' },
          { id: 'meme', label: 'Viral Memes' },
          { id: 'horn', label: 'Airhorns & Klaxon' },
          { id: 'vocal', label: 'Vocals & Crowd' },
          { id: 'bass', label: '808 Drops' },
          { id: 'scratch', label: 'DJ Scratches' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-colors whitespace-nowrap ${
              filterCategory === tab.id
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs font-black'
                : `${textMutedClass} hover:text-white`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Custom Recorded Voice Clips Section (if any exists in File Store) */}
      {savedClips.length > 0 && (
        <div className={`mb-3 p-2.5 ${cardInnerClass} rounded-2xl border`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>My Voice Recordings (File Store)</span>
            </span>
            <span className="text-[10px] text-emerald-500 font-mono font-bold">
              {savedClips.length} active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {savedClips.map((clip) => (
              <button
                key={clip.id}
                onClick={() => {
                  if (onTriggerCustomClip) {
                    onTriggerCustomClip(clip.id);
                  } else {
                    engine.playCustomVoiceClip(clip.id, clip.blob);
                  }
                }}
                className={`p-2 rounded-xl border text-left flex items-center gap-1.5 active:scale-95 transition-all shadow-xs min-h-[44px] ${
                  clip.color || (isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-emerald-900 border-emerald-300')
                }`}
              >
                <span className="text-base">🎙️</span>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{clip.name}</div>
                  <div className="text-[9px] opacity-75 font-mono">{clip.duration.toFixed(1)}s</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drops Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {filteredDrops.map((drop) => {
          const colorClass = isDark ? drop.darkColor : drop.lightColor;
          return (
            <button
              key={drop.id}
              onClick={() => triggerDrop(drop.id)}
              className={`h-14 sm:h-16 rounded-2xl border p-2 flex flex-col justify-center items-center gap-1 transition-all active:scale-95 shadow-sm ${colorClass}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg">{drop.icon}</span>
                <span className="text-xs font-black tracking-tight leading-tight">
                  {drop.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`mt-3 pt-2.5 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between text-[11px] ${textMutedClass} font-semibold`}>
        <span className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Zero-latency Web Audio · Broadcast Bus</span>
        </span>
        <span className="font-mono text-slate-500">TikTok Verified</span>
      </div>
    </div>
  );
};
