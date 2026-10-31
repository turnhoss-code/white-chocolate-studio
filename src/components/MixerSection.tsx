/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Central DJ Mixer & Crossfader Section (Dark Studio Edition)
 */

import React, { useEffect, useState } from 'react';
import { DJEngine, CrossfaderCurve } from '../audio/DJEngine';
import { Sliders, Volume2, Play, Pause, Mic, Sparkles } from 'lucide-react';
import { RecordedVoiceClip } from '../storage/studioStorage';

interface MixerSectionProps {
  engine: DJEngine;
  crossfader: number;
  curve: CrossfaderCurve;
  onCrossfaderChange: (val: number) => void;
  onCurveChange: (curve: CrossfaderCurve) => void;
  onOpenVoiceSampler?: () => void;
  savedClips?: RecordedVoiceClip[];
  onTriggerCustomClip?: (clipId: string) => void;
  isDark?: boolean;
}

export const MixerSection: React.FC<MixerSectionProps> = ({
  engine,
  crossfader,
  curve,
  onCrossfaderChange,
  onCurveChange,
  onOpenVoiceSampler,
  savedClips = [],
  onTriggerCustomClip,
  isDark = true,
}) => {
  // Metering simulation from engine analysers
  const [levelA, setLevelA] = useState(0);
  const [levelB, setLevelB] = useState(0);
  const [levelMaster, setLevelMaster] = useState(0);

  useEffect(() => {
    let animId: number;
    const buf = new Uint8Array(32);

    const checkLevels = () => {
      if (engine.masterAnalyser) {
        engine.masterAnalyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < 16; i++) sum += buf[i];
        setLevelMaster(Math.min(100, Math.round((sum / 16 / 255) * 115)));
      }

      // Deck levels
      if (engine.deckAState.isPlaying) {
        setLevelA(Math.min(100, Math.round(engine.deckAState.volume * 85 + Math.random() * 15)));
      } else {
        setLevelA(0);
      }

      if (engine.deckBState.isPlaying) {
        setLevelB(Math.min(100, Math.round(engine.deckBState.volume * 85 + Math.random() * 15)));
      } else {
        setLevelB(0);
      }

      animId = requestAnimationFrame(checkLevels);
    };

    animId = requestAnimationFrame(checkLevels);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  const triggerTikTokSound = (id: string) => {
    engine.triggerSoundboard(id);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {
        // ignore
      }
    }
  };

  const containerClasses = isDark
    ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-2xl'
    : 'bg-white/95 border-white text-slate-800 shadow-xl';

  const cardInnerClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white/80 border-slate-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex flex-col ${containerClasses} rounded-3xl border p-3.5 sm:p-4 backdrop-blur-md`}>
      {/* Top Mixer Header with Lowrider Chrome Plate styling */}
      <div className={`flex items-center justify-between pb-2.5 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-md">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black tracking-wider block leading-none">
              PRO MIXER
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-bold">
              WEST COAST LOWRIDER
            </span>
          </div>
        </div>

        {/* Crossfader Curve Selector */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] ${textMutedClass} font-mono font-bold`}>CURVE:</span>
          <div className={`flex ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'} p-0.5 rounded-xl border`}>
            {(['smooth', 'cut', 'linear'] as CrossfaderCurve[]).map((c) => (
              <button
                key={c}
                onClick={() => onCurveChange(c)}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg transition-colors ${
                  curve === c
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm font-black'
                    : `${textMutedClass} hover:text-white`
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2 Channels Split: Channel A (Left) & Channel B (Right) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
        {/* ================================================================= */}
        {/* CHANNEL A COLUMN                                                  */}
        {/* ================================================================= */}
        <div className={`flex flex-col items-center ${isDark ? 'bg-slate-950/80 border-rose-900/30' : 'bg-rose-50/70 border-rose-200'} p-2.5 rounded-2xl border shadow-sm`}>
          {/* Channel Header & Dedicated PLAY / PAUSE Button for Deck A */}
          <div className="w-full mb-2">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-xs font-black text-rose-500 tracking-wide">CH A</span>
              <span className={`text-[10px] font-mono ${textMutedClass} truncate max-w-[80px]`}>
                {engine.deckAState.track?.title || 'No Track'}
              </span>
            </div>

            {/* Prominent Play/Pause Button for Deck A */}
            <button
              onClick={() => engine.playPauseDeck('A')}
              className={`w-full py-2 px-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all min-h-[42px] ${
                engine.deckAState.isPlaying
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-400 animate-pulse'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white'
              }`}
              title="Start or pause Deck A selected track"
            >
              {engine.deckAState.isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>PAUSE A</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>PLAY A</span>
                </>
              )}
            </button>
          </div>

          {/* 3-Band EQ Controls */}
          <div className={`w-full space-y-2 mb-3 ${cardInnerClass} p-2 rounded-xl border`}>
            {/* HIGH */}
            <div className="flex flex-col items-center">
              <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
                <span>HI</span>
                <span className="tabular-nums">
                  {engine.deckAState.eq.killHigh ? 'KILL' : `${engine.deckAState.eq.high}dB`}
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={6}
                step={1}
                value={engine.deckAState.eq.high}
                onChange={(e) => engine.setEQ('A', 'high', parseFloat(e.target.value))}
                className="dj-slider w-full h-3 accent-rose-500"
              />
              <button
                onClick={() => engine.toggleEQKill('A', 'high')}
                className={`mt-1 text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                  engine.deckAState.eq.killHigh
                    ? 'bg-rose-600 text-white shadow-xs font-black'
                    : `${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`
                }`}
              >
                KILL
              </button>
            </div>

            {/* MID */}
            <div className="flex flex-col items-center">
              <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
                <span>MID</span>
                <span className="tabular-nums">
                  {engine.deckAState.eq.killMid ? 'KILL' : `${engine.deckAState.eq.mid}dB`}
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={6}
                step={1}
                value={engine.deckAState.eq.mid}
                onChange={(e) => engine.setEQ('A', 'mid', parseFloat(e.target.value))}
                className="dj-slider w-full h-3 accent-rose-500"
              />
              <button
                onClick={() => engine.toggleEQKill('A', 'mid')}
                className={`mt-1 text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                  engine.deckAState.eq.killMid
                    ? 'bg-rose-600 text-white shadow-xs font-black'
                    : `${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`
                }`}
              >
                KILL
              </button>
            </div>

            {/* LOW */}
            <div className="flex flex-col items-center">
              <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
                <span>LOW</span>
                <span className="tabular-nums">
                  {engine.deckAState.eq.killLow ? 'KILL' : `${engine.deckAState.eq.low}dB`}
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={6}
                step={1}
                value={engine.deckAState.eq.low}
                onChange={(e) => engine.setEQ('A', 'low', parseFloat(e.target.value))}
                className="dj-slider w-full h-3 accent-rose-500"
              />
              <button
                onClick={() => engine.toggleEQKill('A', 'low')}
                className={`mt-1 text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                  engine.deckAState.eq.killLow
                    ? 'bg-rose-600 text-white shadow-xs font-black'
                    : `${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`
                }`}
              >
                KILL
              </button>
            </div>
          </div>

          {/* Filter Knob */}
          <div className={`w-full mb-3 p-1.5 ${cardInnerClass} rounded-xl border flex flex-col items-center`}>
            <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
              <span>FILTER</span>
              <span>{engine.deckAState.filter === 0 ? 'BYPASS' : engine.deckAState.filter < 0 ? 'LPF' : 'HPF'}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={engine.deckAState.filter}
              onChange={(e) => engine.setFilter('A', parseFloat(e.target.value))}
              className="dj-slider w-full h-3 accent-rose-500"
            />
            <button
              onClick={() => engine.setFilter('A', 0)}
              className={`mt-1 text-[9px] ${textMutedClass} hover:text-white font-mono font-bold`}
            >
              CENTER
            </button>
          </div>

          {/* Channel Fader & Meter */}
          <div className="flex items-center gap-2 h-32">
            {/* Level Meter */}
            <div className={`w-2.5 h-28 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'} rounded-full overflow-hidden flex flex-col-reverse p-0.5 border`}>
              <div
                className="w-full rounded-full transition-all duration-75"
                style={{
                  height: `${levelA}%`,
                  backgroundColor: levelA > 85 ? '#ef4444' : levelA > 65 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>

            {/* Vertical Fader */}
            <div className="relative h-28 flex items-center justify-center">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={engine.deckAState.volume}
                onChange={(e) => engine.setDeckVolume('A', parseFloat(e.target.value))}
                className="dj-slider -rotate-90 w-24 h-5 accent-rose-500"
              />
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-rose-500 mt-1">VOL A</span>
        </div>

        {/* ================================================================= */}
        {/* CHANNEL B COLUMN                                                  */}
        {/* ================================================================= */}
        <div className={`flex flex-col items-center ${isDark ? 'bg-slate-950/80 border-blue-900/30' : 'bg-sky-50/70 border-sky-200'} p-2.5 rounded-2xl border shadow-sm`}>
          {/* Channel Header & Dedicated PLAY / PAUSE Button for Deck B */}
          <div className="w-full mb-2">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-xs font-black text-blue-400 tracking-wide">CH B</span>
              <span className={`text-[10px] font-mono ${textMutedClass} truncate max-w-[80px]`}>
                {engine.deckBState.track?.title || 'No Track'}
              </span>
            </div>

            {/* Prominent Play/Pause Button for Deck B */}
            <button
              onClick={() => engine.playPauseDeck('B')}
              className={`w-full py-2 px-2.5 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all min-h-[42px] ${
                engine.deckBState.isPlaying
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-400 animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white'
              }`}
              title="Start or pause Deck B selected track"
            >
              {engine.deckBState.isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>PAUSE B</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>PLAY B</span>
                </>
              )}
            </button>
          </div>

          {/* 3-Band EQ Controls */}
          <div className={`w-full space-y-2 mb-3 ${cardInnerClass} p-2 rounded-xl border`}>
            {/* HIGH */}
            <div className="flex flex-col items-center">
              <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
                <span>HI</span>
                <span className="tabular-nums">
                  {engine.deckBState.eq.killHigh ? 'KILL' : `${engine.deckBState.eq.high}dB`}
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={6}
                step={1}
                value={engine.deckBState.eq.high}
                onChange={(e) => engine.setEQ('B', 'high', parseFloat(e.target.value))}
                className="dj-slider w-full h-3 accent-blue-500"
              />
              <button
                onClick={() => engine.toggleEQKill('B', 'high')}
                className={`mt-1 text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                  engine.deckBState.eq.killHigh
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : `${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`
                }`}
              >
                KILL
              </button>
            </div>

            {/* MID */}
            <div className="flex flex-col items-center">
              <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
                <span>MID</span>
                <span className="tabular-nums">
                  {engine.deckBState.eq.killMid ? 'KILL' : `${engine.deckBState.eq.mid}dB`}
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={6}
                step={1}
                value={engine.deckBState.eq.mid}
                onChange={(e) => engine.setEQ('B', 'mid', parseFloat(e.target.value))}
                className="dj-slider w-full h-3 accent-blue-500"
              />
              <button
                onClick={() => engine.toggleEQKill('B', 'mid')}
                className={`mt-1 text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                  engine.deckBState.eq.killMid
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : `${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`
                }`}
              >
                KILL
              </button>
            </div>

            {/* LOW */}
            <div className="flex flex-col items-center">
              <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
                <span>LOW</span>
                <span className="tabular-nums">
                  {engine.deckBState.eq.killLow ? 'KILL' : `${engine.deckBState.eq.low}dB`}
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={6}
                step={1}
                value={engine.deckBState.eq.low}
                onChange={(e) => engine.setEQ('B', 'low', parseFloat(e.target.value))}
                className="dj-slider w-full h-3 accent-blue-500"
              />
              <button
                onClick={() => engine.toggleEQKill('B', 'low')}
                className={`mt-1 text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                  engine.deckBState.eq.killLow
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : `${isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`
                }`}
              >
                KILL
              </button>
            </div>
          </div>

          {/* Filter Knob */}
          <div className={`w-full mb-3 p-1.5 ${cardInnerClass} rounded-xl border flex flex-col items-center`}>
            <div className={`flex justify-between w-full text-[10px] font-mono font-bold ${textMutedClass} mb-0.5`}>
              <span>FILTER</span>
              <span>{engine.deckBState.filter === 0 ? 'BYPASS' : engine.deckBState.filter < 0 ? 'LPF' : 'HPF'}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={engine.deckBState.filter}
              onChange={(e) => engine.setFilter('B', parseFloat(e.target.value))}
              className="dj-slider w-full h-3 accent-blue-500"
            />
            <button
              onClick={() => engine.setFilter('B', 0)}
              className={`mt-1 text-[9px] ${textMutedClass} hover:text-white font-mono font-bold`}
            >
              CENTER
            </button>
          </div>

          {/* Channel Fader & Meter */}
          <div className="flex items-center gap-2 h-32">
            {/* Level Meter */}
            <div className={`w-2.5 h-28 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'} rounded-full overflow-hidden flex flex-col-reverse p-0.5 border`}>
              <div
                className="w-full rounded-full transition-all duration-75"
                style={{
                  height: `${levelB}%`,
                  backgroundColor: levelB > 85 ? '#ef4444' : levelB > 65 ? '#f59e0b' : '#3b82f6',
                }}
              />
            </div>

            {/* Vertical Fader */}
            <div className="relative h-28 flex items-center justify-center">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={engine.deckBState.volume}
                onChange={(e) => engine.setDeckVolume('B', parseFloat(e.target.value))}
                className="dj-slider -rotate-90 w-24 h-5 accent-blue-500"
              />
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-blue-400 mt-1">VOL B</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TIKTOK & QUICK VOICE RECORD FX BUTTONS (DIRECTLY ON MIXERTABLE)        */}
      {/* ===================================================================== */}
      <div className={`rounded-2xl p-2.5 sm:p-3 mb-3 border ${cardInnerClass} shadow-sm`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-black tracking-wide">
              TIKTOK & VOICE QUICK FX
            </span>
          </div>

          {/* Record Voice Clip trigger button */}
          <button
            onClick={onOpenVoiceSampler}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 transition-all active:scale-95 min-h-[32px]"
          >
            <Mic className="w-3 h-3 animate-pulse" />
            <span>Record Voice Clip</span>
          </button>
        </div>

        {/* Popular TikTok Viral Drops */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          <button
            onClick={() => triggerTikTokSound('vine_boom')}
            className={`p-1.5 rounded-xl ${isDark ? 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border-purple-800/60' : 'bg-purple-100 text-purple-900 border-purple-200'} border text-center font-bold text-[10px] transition-all active:scale-95 shadow-xs flex flex-col items-center justify-center min-h-[44px]`}
          >
            <span className="text-sm">💥</span>
            <span className="truncate w-full leading-tight font-black">VINE BOOM</span>
          </button>

          <button
            onClick={() => triggerTikTokSound('bruh')}
            className={`p-1.5 rounded-xl ${isDark ? 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-800/60' : 'bg-amber-100 text-amber-900 border-amber-200'} border text-center font-bold text-[10px] transition-all active:scale-95 shadow-xs flex flex-col items-center justify-center min-h-[44px]`}
          >
            <span className="text-sm">🗿</span>
            <span className="truncate w-full leading-tight font-black">BRUH</span>
          </button>

          <button
            onClick={() => triggerTikTokSound('emotional_damage')}
            className={`p-1.5 rounded-xl ${isDark ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border-rose-800/60' : 'bg-rose-100 text-rose-900 border-rose-200'} border text-center font-bold text-[10px] transition-all active:scale-95 shadow-xs flex flex-col items-center justify-center min-h-[44px]`}
          >
            <span className="text-sm">💔</span>
            <span className="truncate w-full leading-tight font-black">EMOTIONAL</span>
          </button>

          <button
            onClick={() => triggerTikTokSound('oh_no')}
            className={`p-1.5 rounded-xl ${isDark ? 'bg-pink-950/60 hover:bg-pink-900/60 text-pink-300 border-pink-800/60' : 'bg-pink-100 text-pink-900 border-pink-200'} border text-center font-bold text-[10px] transition-all active:scale-95 shadow-xs flex flex-col items-center justify-center min-h-[44px]`}
          >
            <span className="text-sm">🤣</span>
            <span className="truncate w-full leading-tight font-black">OH NO NO</span>
          </button>

          <button
            onClick={() => triggerTikTokSound('ding_levelup')}
            className={`p-1.5 rounded-xl ${isDark ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/60' : 'bg-emerald-100 text-emerald-900 border-emerald-200'} border text-center font-bold text-[10px] transition-all active:scale-95 shadow-xs flex flex-col items-center justify-center min-h-[44px]`}
          >
            <span className="text-sm">🔔</span>
            <span className="truncate w-full leading-tight font-black">LEVEL UP</span>
          </button>

          <button
            onClick={() => triggerTikTokSound('crowd_cheer')}
            className={`p-1.5 rounded-xl ${isDark ? 'bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border-sky-800/60' : 'bg-sky-100 text-sky-900 border-sky-200'} border text-center font-bold text-[10px] transition-all active:scale-95 shadow-xs flex flex-col items-center justify-center min-h-[44px]`}
          >
            <span className="text-sm">🗣️</span>
            <span className="truncate w-full leading-tight font-black">HYPE CROWD</span>
          </button>
        </div>

        {/* Custom Voice Recordings Row (if any recorded in File Store) */}
        {savedClips.length > 0 && (
          <div className={`mt-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={`text-[10px] font-bold ${textMutedClass} uppercase tracking-wider block mb-1`}>
              My Recorded Voice FX:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {savedClips.slice(0, 6).map((clip) => (
                <button
                  key={clip.id}
                  onClick={() => {
                    if (onTriggerCustomClip) {
                      onTriggerCustomClip(clip.id);
                    } else {
                      engine.playCustomVoiceClip(clip.id, clip.blob);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border shadow-xs flex items-center gap-1 active:scale-95 transition-all min-h-[36px] ${
                    clip.color || (isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-100 text-rose-800 border-rose-300')
                  }`}
                >
                  <span>🎙️</span>
                  <span className="truncate max-w-[120px]">{clip.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Master Broadcast Bus Level */}
      <div className={`${cardInnerClass} rounded-2xl p-2.5 mb-3 border`}>
        <div className={`flex justify-between items-center text-[10px] font-mono font-bold ${textMutedClass} mb-1`}>
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MASTER BROADCAST BUS</span>
          </span>
          <span className="text-emerald-400 font-bold tabular-nums">
            {levelMaster > 90 ? 'PEAK' : `${levelMaster}%`}
          </span>
        </div>
        <div className={`h-3 w-full ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'} rounded-full overflow-hidden p-0.5 flex items-center border`}>
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${levelMaster}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 70%, #ef4444 92%)',
            }}
          />
        </div>
      </div>

      {/* Main Crossfader Unit */}
      <div className={`${cardInnerClass} rounded-2xl p-3 border shadow-inner`}>
        <div className="flex justify-between items-center text-[11px] font-black tracking-wider mb-2">
          <span className="text-rose-500">DECK A</span>
          <button
            onClick={() => onCrossfaderChange(0)}
            className={`text-[10px] px-2.5 py-0.5 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} font-mono font-bold transition-colors`}
            title="Snap Crossfader to Center"
          >
            CENTER
          </button>
          <span className="text-blue-400">DECK B</span>
        </div>

        {/* Heavy Duty Crossfader Track */}
        <div className="px-2 py-1">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="crossfader-slider w-full h-8"
          />
        </div>
      </div>
    </div>
  );
};
