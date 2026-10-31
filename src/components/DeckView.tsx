/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Lowrider DJ Deck View Component
 */

import React, { useRef } from 'react';
import { DJEngine, DeckState, FilterPresetId } from '../audio/DJEngine';
import { TrackMetadata, STUDIO_ICON_URL } from '../audio/proceduralTracks';
import { JogWheel } from './JogWheel';
import { WaveformDisplay } from './WaveformDisplay';
import { Play, Pause, RotateCcw, Zap, Music, Upload, Download, Disc } from 'lucide-react';

interface DeckViewProps {
  deckId: 'A' | 'B';
  engine: DJEngine;
  state: DeckState;
  availableTracks: TrackMetadata[];
  onTrackAdded?: (track: TrackMetadata) => void;
}

const FILTER_PRESETS: Array<{ id: FilterPresetId; label: string }> = [
  { id: 'bypass', label: 'Clean' },
  { id: 'sub_boost', label: '808 Sub' },
  { id: 'velvet_warmth', label: '90s Warm' },
  { id: 'chopped_slow', label: 'Screwed' },
  { id: 'vocal_iso', label: 'Vocal' },
  { id: 'lofi_telephone', label: 'Lo-Fi' },
];

export const DeckView: React.FC<DeckViewProps> = ({
  deckId,
  engine,
  state,
  availableTracks,
  onTrackAdded,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const color = deckId === 'A' ? '#ef4444' : '#3b82f6';
  const borderAccent = deckId === 'A' ? 'border-rose-500/30' : 'border-blue-500/30';

  const handleSelectTrack = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const trackId = e.target.value;
    const found = availableTracks.find((t) => t.id === trackId);
    if (found) {
      engine.loadTrack(deckId, found);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const loaded = await engine.loadCustomAudioFile(file, deckId);
      if (loaded && onTrackAdded) {
        onTrackAdded(loaded);
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`flex flex-col bg-slate-900/95 rounded-2xl border ${borderAccent} p-3 sm:p-4 shadow-xl relative overflow-hidden`}
    >
      {/* Top Chrome Pinstripe Accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background:
            deckId === 'A'
              ? 'linear-gradient(90deg, #94a3b8 0%, #ef4444 35%, #f59e0b 50%, #ef4444 65%, #94a3b8 100%)'
              : 'linear-gradient(90deg, #94a3b8 0%, #3b82f6 35%, #e2e8f0 50%, #3b82f6 65%, #94a3b8 100%)',
        }}
      />

      {/* Top Track Info & BPM / Tap Tempo */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-400/60 shrink-0 shadow-md">
            <img
              src={state.track?.coverImage || STUDIO_ICON_URL}
              alt={`Deck ${deckId}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <span
              className="absolute bottom-0 right-0 px-1 text-[9px] font-black text-white leading-tight"
              style={{ backgroundColor: color }}
            >
              {deckId}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate">
              {state.track?.title || `Deck ${deckId} (Empty)`}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {state.track?.artist || 'Select or upload a track'}
              {state.track?.key ? ` · ${state.track.key}` : ''}
            </p>
          </div>
        </div>

        {/* BPM Readout & Tap Tempo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => engine.tapTempo(deckId)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-mono font-bold text-amber-300 border border-slate-700 transition-transform"
            title="Tap 3+ times to match BPM"
          >
            TAP
          </button>
          <div className="text-right">
            <div className="text-base sm:text-lg font-black font-mono tracking-tight text-white tabular-nums leading-none">
              {state.effectiveBpm.toFixed(1)}{' '}
              <span className="text-[10px] font-normal text-slate-400">BPM</span>
            </div>
            <div className="text-[10px] font-mono text-amber-400 tabular-nums mt-0.5">
              {state.tempo >= 0
                ? `+${(state.tempo * 100).toFixed(1)}%`
                : `${(state.tempo * 100).toFixed(1)}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Track Selector, Upload Music File & Download WAV */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="relative flex-1 min-w-0">
          <select
            value={state.track?.id || ''}
            onChange={handleSelectTrack}
            className="w-full h-8 pl-2 pr-7 text-xs bg-slate-950 text-slate-200 border border-slate-700/80 rounded-lg focus:outline-none focus:border-amber-400 appearance-none truncate"
          >
            <option value="" disabled>
              Select Track from Crate...
            </option>
            {availableTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.bpm} BPM) · {t.genre}
              </option>
            ))}
          </select>
          <Music className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-2.5 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 text-xs font-semibold rounded-lg border border-slate-600 shrink-0 transition-colors whitespace-nowrap"
          title="Upload MP3 / WAV / Audio File from device"
        >
          <Upload className="w-3.5 h-3.5 text-amber-400" />
          <span>Upload</span>
        </button>

        <button
          onClick={() => engine.downloadDeckTrackWav(deckId)}
          disabled={!state.track?.buffer}
          className="h-8 px-2.5 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 text-xs font-semibold rounded-lg border border-slate-600 shrink-0 transition-colors whitespace-nowrap"
          title="Download current Deck Track as WAV file"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">WAV</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Waveform Visualizer */}
      <div className="mb-2.5">
        <WaveformDisplay
          track={state.track}
          currentTime={state.currentTime}
          duration={state.duration}
          cuePoint={state.cuePoint}
          hotCues={state.hotCues}
          color={color}
          onSeek={(time) => engine.scrubDeck(deckId, time)}
          height={46}
        />
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1 px-1 tabular-nums">
          <span>{formatTime(state.currentTime)}</span>
          <span>{ state.platterStyle === 'chrome_100_spoke' ? '100-SPOKE CHROME RIM' : 'CLASSIC VINYL' }</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Main 100-Spoke Chrome Wheel Platter & Pitch Fader */}
      <div className="flex items-center justify-around gap-2 mb-3">
        <JogWheel
          deckId={deckId}
          isPlaying={state.isPlaying}
          isScratching={state.isScratching}
          rotationAngle={state.rotationAngle}
          bpm={state.effectiveBpm}
          color={color}
          coverImage={state.track?.coverImage || engine.customCoverUrl}
          platterStyle={state.platterStyle}
          onTogglePlatterStyle={() => {
            state.platterStyle =
              state.platterStyle === 'chrome_100_spoke' ? 'vinyl' : 'chrome_100_spoke';
            engine.notifyUpdate();
          }}
          onScratchStart={() => engine.startScratch(deckId)}
          onScratchMove={(delta) => engine.scratchMove(deckId, delta)}
          onScratchEnd={() => engine.endScratch(deckId)}
          onPitchNudge={(dir) => engine.nudgePitch(deckId, dir)}
        />

        {/* Vertical Tempo / Pitch Fader */}
        <div className="flex flex-col items-center bg-slate-950/80 p-2 rounded-xl border border-slate-800 h-52 justify-between">
          <div className="text-[10px] font-mono text-slate-400 font-bold">TEMPO</div>
          <div className="text-[10px] font-mono text-amber-400 font-bold tabular-nums">
            {state.tempo >= 0
              ? `+${(state.tempo * 100).toFixed(1)}%`
              : `${(state.tempo * 100).toFixed(1)}%`}
          </div>

          <div className="relative h-32 flex items-center justify-center">
            <input
              type="range"
              min={-0.25}
              max={0.25}
              step={0.001}
              value={state.tempo}
              onChange={(e) => engine.setTempo(deckId, parseFloat(e.target.value))}
              className="dj-slider -rotate-90 w-28 h-6"
            />
          </div>

          <button
            onClick={() => engine.setTempo(deckId, 0)}
            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-mono"
            title="Reset Tempo to 0%"
          >
            RESET
          </button>
        </div>
      </div>

      {/* Transport Controls: Play/Pause, CUE, SYNC */}
      <div className="grid grid-cols-3 gap-2 mb-2.5">
        <button
          onClick={() => engine.playPauseDeck(deckId)}
          className={`h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 whitespace-nowrap ${
            state.isPlaying
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600'
          }`}
        >
          {state.isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{state.isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          onPointerDown={() => engine.triggerCue(deckId, true)}
          onPointerUp={() => engine.triggerCue(deckId, false)}
          onPointerLeave={() => engine.triggerCue(deckId, false)}
          className={`h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 whitespace-nowrap ${
            state.isCuePressed
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>CUE</span>
        </button>

        <button
          onClick={() => engine.syncDeck(deckId)}
          className="h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-transform active:scale-95 whitespace-nowrap"
          title="Auto-match BPM and beat phase to opposite deck"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>SYNC</span>
        </button>
      </div>

      {/* Quick Studio Filter Style Presets */}
      <div className="bg-slate-950/70 rounded-xl p-2 mb-2.5 border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-300 tracking-wider flex items-center gap-1">
            <Disc className="w-3 h-3 text-amber-400" />
            <span>STUDIO FILTER TONE</span>
          </span>
          <span className="text-[10px] font-mono text-amber-400 uppercase">
            {state.activeFilterPreset.replace('_', ' ')}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => engine.applyFilterPreset(deckId, preset.id)}
              className={`h-7 rounded text-[10px] font-bold transition-colors whitespace-nowrap px-1 ${
                state.activeFilterPreset === preset.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loop & Beat Roll Section */}
      <div className="bg-slate-950/70 rounded-xl p-2 mb-2.5 border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">LOOP / CHOP ROLL</span>
          <button
            onClick={() => engine.toggleLoop(deckId)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
              state.loop.active
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {state.loop.active ? 'ACTIVE' : 'OFF'}
          </button>
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
              className={`h-7 rounded text-[11px] font-mono font-bold transition-colors ${
                state.loop.active && state.loop.lengthBeats === beats
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {beats === 0.5 ? '1/2' : `${beats}B`}
            </button>
          ))}
        </div>
      </div>

      {/* Hot Cues (1, 2, 3, 4) */}
      <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">HOT CUES</span>
          <span className="text-[9px] text-slate-500">Tap to Jump · Right-Click to Clear</span>
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
                className={`h-9 rounded-lg font-mono font-bold text-xs flex flex-col items-center justify-center border transition-transform active:scale-95 ${
                  hasCue
                    ? 'text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
                style={{
                  backgroundColor: hasCue ? padColor : undefined,
                  borderColor: hasCue ? padColor : undefined,
                }}
              >
                <span>{idx + 1}</span>
                {hasCue && (
                  <span className="text-[8px] opacity-80 leading-none tabular-nums">
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
