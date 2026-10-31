/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Complete DJ Deck View Component (Dark Studio Edition)
 * Featuring Instant Beat & Tempo Sync to Active Deck for Seamless Transitions
 */

import React, { useRef, useState } from 'react';
import { DJEngine, DeckState } from '../audio/DJEngine';
import { TrackMetadata } from '../audio/proceduralTracks';
import { JogWheel } from './JogWheel';
import { WaveformDisplay } from './WaveformDisplay';
import { Play, Pause, Zap, Music, Upload, Check } from 'lucide-react';

interface DeckViewProps {
  deckId: 'A' | 'B';
  engine: DJEngine;
  state: DeckState;
  availableTracks: TrackMetadata[];
  isDark?: boolean;
}

export const DeckView: React.FC<DeckViewProps> = ({
  deckId,
  engine,
  state,
  availableTracks,
  isDark = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [syncFlash, setSyncFlash] = useState(false);

  const isA = deckId === 'A';
  const color = isA ? '#ef4444' : '#3b82f6';
  const otherDeckId = isA ? 'B' : 'A';
  const otherDeck = isA ? engine.deckBState : engine.deckAState;

  // Sync detection: are both tracks loaded and matching effective BPM within 0.15?
  const isBpmSynced = Boolean(
    state.track &&
    otherDeck.track &&
    Math.abs(state.effectiveBpm - otherDeck.effectiveBpm) < 0.2
  );

  const isOtherActive = Boolean(otherDeck.isPlaying && !state.isPlaying);

  const handleSelectTrack = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const trackId = e.target.value;
    const found = availableTracks.find((t) => t.id === trackId);
    if (found) {
      engine.loadTrack(deckId, found);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      engine.loadCustomAudioFile(file, deckId);
    }
  };

  const handleSyncClick = () => {
    engine.syncDeck(deckId);
    setSyncFlash(true);
    setTimeout(() => setSyncFlash(false), 900);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Dark Theme Styling Classes
  const containerClasses = isDark
    ? isA
      ? 'bg-slate-900/95 border-slate-800 shadow-rose-950/20 text-slate-100'
      : 'bg-slate-900/95 border-slate-800 shadow-blue-950/20 text-slate-100'
    : isA
    ? 'bg-gradient-to-b from-rose-50/90 to-white border-rose-200 text-slate-800'
    : 'bg-gradient-to-b from-sky-50/90 to-white border-sky-200 text-slate-800';

  const cardInnerClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div
      className={`flex flex-col ${containerClasses} rounded-3xl border shadow-2xl p-3.5 sm:p-4 relative overflow-hidden backdrop-blur-md transition-all duration-200`}
    >
      {/* Top Track Info & Select */}
      <div className={`flex items-center justify-between gap-2 mb-2 pb-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-md"
            style={{ backgroundColor: color }}
          >
            {deckId}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black truncate flex items-center gap-1.5 leading-tight">
              <span>{state.track?.title || `Deck ${deckId} (Empty)`}</span>
              {state.track?.key && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'} font-mono font-bold border`}>
                  {state.track.key}
                </span>
              )}
            </h2>
            <p className={`text-[11px] ${textMutedClass} font-semibold truncate`}>
              {state.track?.artist || 'Select or drop an audio track'}
            </p>
          </div>
        </div>

        {/* BPM readout & Pitch Offset */}
        <div className="text-right shrink-0">
          <div className="text-lg font-black font-mono tracking-tight tabular-nums flex items-center justify-end gap-1">
            <span>{state.effectiveBpm.toFixed(1)}</span>
            <span className={`text-[10px] font-normal ${textMutedClass}`}>BPM</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] font-mono font-bold tabular-nums">
            <span className={state.tempo > 0 ? 'text-amber-400' : state.tempo < 0 ? 'text-cyan-400' : textMutedClass}>
              {state.tempo >= 0 ? `+${(state.tempo * 100).toFixed(1)}%` : `${(state.tempo * 100).toFixed(1)}%`}
            </span>
            {isBpmSynced && (
              <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                SYNC
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Track Selector & Local Audio Import Button */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="relative flex-1">
          <select
            value={state.track?.id || ''}
            onChange={handleSelectTrack}
            className={`w-full h-8 pl-2 pr-7 text-xs font-semibold ${isDark ? 'bg-slate-950 text-slate-200 border-slate-800 focus:border-slate-600' : 'bg-white text-slate-800 border-slate-300 focus:border-rose-400'} border rounded-xl focus:outline-none appearance-none truncate shadow-xs`}
          >
            <option value="" disabled>
              Select Track Library...
            </option>
            {availableTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.bpm} BPM) · {t.genre}
              </option>
            ))}
          </select>
          <Music className={`w-3.5 h-3.5 ${textMutedClass} absolute right-2.5 top-2.5 pointer-events-none`} />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className={`h-8 px-2.5 flex items-center gap-1 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'} text-xs font-bold rounded-xl border shrink-0 transition-colors shadow-xs`}
          title="Upload local MP3 / WAV from device"
        >
          <Upload className={`w-3.5 h-3.5 ${isA ? 'text-rose-400' : 'text-blue-400'}`} />
          <span className="hidden sm:inline">Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Waveform visualizer */}
      <div className={`mb-3 ${cardInnerClass} p-1.5 rounded-2xl border shadow-inner`}>
        <WaveformDisplay
          track={state.track}
          currentTime={state.currentTime}
          duration={state.duration}
          cuePoint={state.cuePoint}
          hotCues={state.hotCues}
          color={color}
          onSeek={(time) => engine.scrubDeck(deckId, time)}
          height={48}
        />
        <div className={`flex justify-between items-center text-[10px] font-mono font-bold ${textMutedClass} mt-1 px-1`}>
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Main Platter & Pitch Fader Section */}
      <div className="flex items-center justify-around gap-2 mb-3">
        {/* Jog Wheel Platter */}
        <JogWheel
          deckId={deckId}
          isPlaying={state.isPlaying}
          isScratching={state.isScratching}
          rotationAngle={state.rotationAngle}
          bpm={state.effectiveBpm}
          color={color}
          coverImage={state.track?.coverImage || engine.customCoverUrl}
          onScratchStart={() => engine.startScratch(deckId)}
          onScratchMove={(delta) => engine.scratchMove(deckId, delta)}
          onScratchEnd={() => engine.endScratch(deckId)}
          onPitchNudge={(dir) => engine.nudgePitch(deckId, dir)}
        />

        {/* Vertical Tempo / Pitch Fader with Direct Pitch Sync */}
        <div className={`flex flex-col items-center ${cardInnerClass} p-2 rounded-2xl border h-52 justify-between shadow-sm`}>
          <div className={`text-[10px] font-mono font-bold ${textMutedClass}`}>PITCH</div>
          <div className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
            {state.tempo >= 0 ? `+${(state.tempo * 100).toFixed(1)}%` : `${(state.tempo * 100).toFixed(1)}%`}
          </div>

          {/* Slider with wide dynamic range */}
          <div className="relative h-28 flex items-center justify-center">
            <input
              type="range"
              min={Math.min(-0.35, state.tempo)}
              max={Math.max(0.35, state.tempo)}
              step={0.001}
              value={state.tempo}
              onChange={(e) => engine.setTempo(deckId, parseFloat(e.target.value), true)}
              className="dj-slider -rotate-90 w-28 h-6 accent-rose-500"
            />
          </div>

          <div className="flex flex-col gap-1 w-full">
            <button
              onClick={() => engine.setTempo(deckId, 0)}
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
              title="Reset Pitch to 0%"
            >
              RESET
            </button>
            <button
              onClick={handleSyncClick}
              className={`text-[9px] font-mono font-bold px-1.5 py-1 rounded transition-all active:scale-95 flex items-center justify-center gap-0.5 ${
                isBpmSynced
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
              }`}
              title={`Sync BPM to Deck ${otherDeckId}`}
            >
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>SYNC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Transport Controls: PLAY/PAUSE, CUE, and Dedicated Master BPM SYNC BUTTON */}
      <div className="grid grid-cols-12 gap-2 mb-3">
        {/* Big PLAY/PAUSE Button */}
        <button
          onClick={() => engine.playPauseDeck(deckId)}
          className={`col-span-5 h-12 rounded-2xl flex items-center justify-center gap-1.5 font-black text-xs tracking-wider transition-all shadow-lg active:scale-95 ${
            state.isPlaying
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white ring-2 ring-emerald-400 animate-pulse'
              : isA
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white'
              : 'bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white'
          }`}
        >
          {state.isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* CUE Button */}
        <button
          onMouseDown={() => engine.triggerCue(deckId, true)}
          onMouseUp={() => engine.triggerCue(deckId, false)}
          onTouchStart={() => engine.triggerCue(deckId, true)}
          onTouchEnd={() => engine.triggerCue(deckId, false)}
          className={`col-span-3 h-12 rounded-2xl font-mono font-bold text-xs flex items-center justify-center transition-all border shadow-sm active:scale-95 ${
            state.isCuePressed
              ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-amber-400/30'
              : isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
          }`}
        >
          CUE
        </button>

        {/* DEDICATED PRO-GRADE SYNC BUTTON */}
        {/* Automatically adjusts playback speed of non-playing deck to match BPM of active deck */}
        <button
          onClick={handleSyncClick}
          className={`col-span-4 h-12 rounded-2xl font-mono font-bold text-xs flex flex-col items-center justify-center transition-all border shadow-md active:scale-95 ${
            syncFlash
              ? 'bg-amber-400 text-slate-950 scale-105 border-white ring-2 ring-amber-300'
              : isBpmSynced
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20'
              : isOtherActive
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 border-amber-400 animate-pulse'
              : isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
              : 'bg-white hover:bg-slate-50 text-amber-600 border-slate-300'
          }`}
          title={
            isOtherActive
              ? `Sync Deck ${deckId} playback speed to active Deck ${otherDeckId} (${otherDeck.effectiveBpm.toFixed(1)} BPM)`
              : `Sync playback speed between Deck A and Deck B for seamless transition`
          }
        >
          <div className="flex items-center gap-1 leading-none">
            {isBpmSynced ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-current fill-current" />
            )}
            <span className="font-black tracking-tight">SYNC</span>
          </div>
          <span className="text-[9px] opacity-90 leading-tight truncate font-mono mt-0.5">
            {isBpmSynced ? `${state.effectiveBpm.toFixed(1)} BPM` : `→ ${otherDeck.effectiveBpm.toFixed(1)}`}
          </span>
        </button>
      </div>

      {/* Auto Beat Looper */}
      <div className={`${cardInnerClass} rounded-2xl p-2 border mb-2.5 shadow-sm`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-bold ${textMutedClass} tracking-wider`}>BEAT LOOP</span>
          <span className="text-[10px] font-mono font-bold text-amber-400">
            {state.loop.active ? `${state.loop.lengthBeats} BEATS (ACTIVE)` : 'OFF'}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[0.5, 1, 2, 4, 8].map((beats) => (
            <button
              key={beats}
              onClick={() => {
                if (state.loop.active && state.loop.lengthBeats === beats) {
                  engine.toggleLoop(deckId);
                } else {
                  engine.setLoopLength(deckId, beats);
                  if (!state.loop.active) engine.toggleLoop(deckId, beats);
                }
              }}
              className={`h-7 rounded-lg text-[11px] font-mono font-bold transition-all ${
                state.loop.active && state.loop.lengthBeats === beats
                  ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                  : isDark
                  ? 'bg-slate-850 hover:bg-slate-800 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {beats === 0.5 ? '1/2' : `${beats}B`}
            </button>
          ))}
        </div>
      </div>

      {/* Hot Cues (1, 2, 3, 4) */}
      <div className={`${cardInnerClass} rounded-2xl p-2 border shadow-sm`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[10px] font-bold ${textMutedClass} tracking-wider`}>HOT CUES</span>
          <span className={`text-[9px] ${textMutedClass} font-semibold`}>Tap Jump · Right-click clear</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {state.hotCues.map((cue, idx) => {
            const hasCue = cue !== null;
            const padColors = ['#ef4444', '#3b82f6', '#10b981', '#a855f7'];
            const padColor = padColors[idx];

            return (
              <button
                key={idx}
                onClick={() => engine.triggerHotCue(deckId, idx)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  engine.deleteHotCue(deckId, idx);
                }}
                className={`h-9 rounded-xl font-mono font-bold text-xs flex flex-col items-center justify-center border transition-all active:scale-95 ${
                  hasCue
                    ? 'text-white shadow-xs font-black'
                    : isDark
                    ? 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-850'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
                style={{
                  backgroundColor: hasCue ? padColor : undefined,
                  borderColor: hasCue ? padColor : undefined,
                }}
              >
                <span>{idx + 1}</span>
                {hasCue && (
                  <span className="text-[8px] opacity-90 leading-none">
                    {formatTime(cue)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
