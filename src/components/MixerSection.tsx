/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Central DJ Mixer, Voice Clip Recorder, Voice FX & Swappable Sampler Slots
 */

import React, { useEffect, useState, useRef } from 'react';
import { DJEngine, CrossfaderCurve, MicVoiceEffect } from '../audio/DJEngine';
import { TrackMetadata, downloadAudioBufferAsWav } from '../audio/proceduralTracks';
import {
  Sliders,
  Volume2,
  Mic,
  MicOff,
  Play,
  Square,
  Upload,
  Download,
  ArrowLeftRight,
  Disc,
  ShieldAlert,
  Sparkles,
  Music,
  Search,
  FolderPlus,
} from 'lucide-react';

interface MixerSectionProps {
  engine: DJEngine;
  crossfader: number;
  curve: CrossfaderCurve;
  onCrossfaderChange: (val: number) => void;
  onCurveChange: (curve: CrossfaderCurve) => void;
  availableTracks: TrackMetadata[];
  onAddTrackToLibrary: (track: TrackMetadata) => void;
}

const VOICE_FX_LIST: Array<{ id: MicVoiceEffect; label: string }> = [
  { id: 'clean', label: 'Clean' },
  { id: 'chopped', label: 'Chopped' },
  { id: 'talkbox', label: 'Talkbox' },
  { id: 'radio', label: 'Radio' },
  { id: 'robot', label: 'Robot' },
  { id: 'reverb', label: 'Reverb' },
  { id: 'echo', label: 'Echo' },
];

export const MixerSection: React.FC<MixerSectionProps> = ({
  engine,
  crossfader,
  curve,
  onCrossfaderChange,
  onCurveChange,
  availableTracks,
  onAddTrackToLibrary,
}) => {
  const [levelA, setLevelA] = useState(0);
  const [levelB, setLevelB] = useState(0);
  const [levelMaster, setLevelMaster] = useState(0);

  // Swappable voice clip state: holds index of the first slot selected for swapping
  const [swapSourceIndex, setSwapSourceIndex] = useState<number | null>(null);
  const [uploadTargetSlot, setUploadTargetSlot] = useState<number>(0);
  const slotFileInputRef = useRef<HTMLInputElement | null>(null);
  const deckAFileRef = useRef<HTMLInputElement | null>(null);
  const deckBFileRef = useRef<HTMLInputElement | null>(null);

  // Local Music Library Crate state inside Mixer
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'local' | 'funk' | 'slowjam'>('all');
  const [isImportingFiles, setIsImportingFiles] = useState(false);
  const libraryFileInputRef = useRef<HTMLInputElement | null>(null);

  // Real-Time Dual-Deck Frequency Spectrum Visualizer state & canvas ref
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spectrumMode, setSpectrumMode] = useState<'split' | 'overlay' | 'mirror'>('split');
  const peakHoldARef = useRef<number[]>(new Array(32).fill(0));
  const peakHoldBRef = useRef<number[]>(new Array(32).fill(0));

  useEffect(() => {
    let animId: number;
    const bufMaster = new Uint8Array(64);
    const bufA = new Uint8Array(64);
    const bufB = new Uint8Array(64);

    const renderLoop = () => {
      // 1. Master Bus Level
      if (engine.masterAnalyser) {
        engine.masterAnalyser.getByteFrequencyData(bufMaster);
        let sum = 0;
        for (let i = 0; i < 24; i++) sum += bufMaster[i];
        setLevelMaster(Math.min(100, Math.round((sum / 24 / 255) * 120)));
      }

      // 2. Deck A Incoming Audio Spectrum & Level
      const analyserA = engine.getDeckAnalyser('A');
      if (analyserA && engine.deckAState.isPlaying) {
        analyserA.getByteFrequencyData(bufA);
        let sumA = 0;
        for (let i = 0; i < 24; i++) sumA += bufA[i];
        setLevelA(Math.min(100, Math.round((sumA / 24 / 255) * 125)));
      } else {
        bufA.fill(0);
        setLevelA(0);
      }

      // 3. Deck B Incoming Audio Spectrum & Level
      const analyserB = engine.getDeckAnalyser('B');
      if (analyserB && engine.deckBState.isPlaying) {
        analyserB.getByteFrequencyData(bufB);
        let sumB = 0;
        for (let i = 0; i < 24; i++) sumB += bufB[i];
        setLevelB(Math.min(100, Math.round((sumB / 24 / 255) * 125)));
      } else {
        bufB.fill(0);
        setLevelB(0);
      }

      // 4. Draw Real-Time Dual-Deck Frequency Spectrum on Canvas
      const canvas = spectrumCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Subtle studio dark background & dB / Frequency reference grid
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
          ctx.lineWidth = 1;
          for (let row = 1; row <= 3; row++) {
            const y = Math.round((h / 4) * row) + 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
          for (let col = 1; col < 8; col++) {
            const x = Math.round((w / 8) * col) + 0.5;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }

          const bins = 32;
          const peaksA = peakHoldARef.current;
          const peaksB = peakHoldBRef.current;

          for (let i = 0; i < bins; i++) {
            const vA = bufA[i] / 255;
            const vB = bufB[i] / 255;
            peaksA[i] = vA > peaksA[i] ? vA : Math.max(0, peaksA[i] - 0.012);
            peaksB[i] = vB > peaksB[i] ? vB : Math.max(0, peaksB[i] - 0.012);
          }

          if (spectrumMode === 'split') {
            // Left half: Deck A (Low -> High), Right half: Deck B (Low -> High)
            const halfW = w / 2;
            const barW = (halfW - 6) / bins;

            // Center divider line
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
            ctx.beginPath();
            ctx.moveTo(halfW, 0);
            ctx.lineTo(halfW, h);
            ctx.stroke();

            for (let i = 0; i < bins; i++) {
              // Deck A bar
              const valA = bufA[i] / 255;
              const barHA = Math.max(2, valA * (h - 16));
              const xA = 2 + i * barW;
              const yA = h - barHA;

              const gradA = ctx.createLinearGradient(0, h, 0, 8);
              gradA.addColorStop(0, '#be123c');
              gradA.addColorStop(0.55, '#ef4444');
              gradA.addColorStop(1, '#fbbf24');
              ctx.fillStyle = gradA;
              ctx.fillRect(xA, yA, Math.max(1.5, barW - 1.5), barHA);

              // Deck A peak cap
              const peakYA = h - Math.max(3, peaksA[i] * (h - 16));
              ctx.fillStyle = '#fef08a';
              ctx.fillRect(xA, peakYA - 2, Math.max(1.5, barW - 1.5), 2);

              // Deck B bar
              const valB = bufB[i] / 255;
              const barHB = Math.max(2, valB * (h - 16));
              const xB = halfW + 4 + i * barW;
              const yB = h - barHB;

              const gradB = ctx.createLinearGradient(0, h, 0, 8);
              gradB.addColorStop(0, '#1d4ed8');
              gradB.addColorStop(0.55, '#3b82f6');
              gradB.addColorStop(1, '#38bdf8');
              ctx.fillStyle = gradB;
              ctx.fillRect(xB, yB, Math.max(1.5, barW - 1.5), barHB);

              // Deck B peak cap
              const peakYB = h - Math.max(3, peaksB[i] * (h - 16));
              ctx.fillStyle = '#e0f2fe';
              ctx.fillRect(xB, peakYB - 2, Math.max(1.5, barW - 1.5), 2);
            }
          } else if (spectrumMode === 'overlay') {
            // Overlapping RTA Spectral Curves for Deck A & Deck B to compare EQ pockets
            const drawCurve = (
              data: Uint8Array,
              strokeColor: string,
              fillTop: string,
              fillBottom: string
            ) => {
              ctx.beginPath();
              ctx.moveTo(0, h);
              for (let i = 0; i < bins; i++) {
                const x = (i / (bins - 1)) * w;
                const val = data[i] / 255;
                const y = h - Math.max(3, val * (h - 14));
                if (i === 0) {
                  ctx.lineTo(x, y);
                } else {
                  const prevX = ((i - 1) / (bins - 1)) * w;
                  const prevVal = data[i - 1] / 255;
                  const prevY = h - Math.max(3, prevVal * (h - 14));
                  const cx = (prevX + x) / 2;
                  ctx.quadraticCurveTo(prevX, prevY, cx, (prevY + y) / 2);
                }
              }
              ctx.lineTo(w, h);
              ctx.closePath();

              const grad = ctx.createLinearGradient(0, 0, 0, h);
              grad.addColorStop(0, fillTop);
              grad.addColorStop(1, fillBottom);
              ctx.fillStyle = grad;
              ctx.fill();

              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = 2;
              ctx.stroke();
            };

            drawCurve(
              bufA,
              '#f43f5e',
              'rgba(244, 63, 94, 0.55)',
              'rgba(244, 63, 94, 0.05)'
            );
            drawCurve(
              bufB,
              '#38bdf8',
              'rgba(56, 189, 248, 0.55)',
              'rgba(56, 189, 248, 0.05)'
            );
          } else {
            // 'mirror' mode: Deck A grows UP from center line, Deck B grows DOWN from center line
            const midY = h / 2;
            const barW = w / bins;

            ctx.strokeStyle = 'rgba(248, 250, 252, 0.2)';
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(w, midY);
            ctx.stroke();

            for (let i = 0; i < bins; i++) {
              const x = i * barW + 1;
              const bw = Math.max(2, barW - 2);

              // Deck A (top half)
              const hA = Math.max(1.5, (bufA[i] / 255) * (midY - 6));
              const gradA = ctx.createLinearGradient(0, midY, 0, 4);
              gradA.addColorStop(0, '#ef4444');
              gradA.addColorStop(1, '#fbbf24');
              ctx.fillStyle = gradA;
              ctx.fillRect(x, midY - hA, bw, hA);

              // Deck B (bottom half)
              const hB = Math.max(1.5, (bufB[i] / 255) * (midY - 6));
              const gradB = ctx.createLinearGradient(0, midY, 0, h - 4);
              gradB.addColorStop(0, '#3b82f6');
              gradB.addColorStop(1, '#38bdf8');
              ctx.fillStyle = gradB;
              ctx.fillRect(x, midY, bw, hB);
            }
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [engine, spectrumMode]);

  const handleSlotSwapClick = (index: number) => {
    if (swapSourceIndex === null) {
      setSwapSourceIndex(index);
    } else if (swapSourceIndex === index) {
      setSwapSourceIndex(null);
    } else {
      engine.swapVoiceSlots(swapSourceIndex, index);
      setSwapSourceIndex(null);
    }
  };

  const handleSlotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await engine.uploadVoiceSlotFile(uploadTargetSlot, file);
      e.target.value = '';
    }
  };

  const handleBatchLibraryImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsImportingFiles(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const decodedTrack = await engine.decodeAudioFileToTrack(files[i]);
        if (decodedTrack) {
          onAddTrackToLibrary(decodedTrack);
        }
      }
      setLibraryFilter('all');
    } finally {
      setIsImportingFiles(false);
      e.target.value = '';
    }
  };

  const filteredTracks = availableTracks.filter((track) => {
    const q = librarySearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.genre.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (libraryFilter === 'local') {
      return track.id.startsWith('local_') || track.id.startsWith('custom_');
    }
    if (libraryFilter === 'funk') {
      return (
        track.genre.toLowerCase().includes('funk') ||
        track.genre.toLowerCase().includes('bounce') ||
        track.genre.toLowerCase().includes('club')
      );
    }
    if (libraryFilter === 'slowjam') {
      return (
        track.genre.toLowerCase().includes('slow') ||
        track.genre.toLowerCase().includes('chopped') ||
        track.genre.toLowerCase().includes('velvet')
      );
    }
    return true;
  });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col bg-slate-900/95 rounded-2xl border border-amber-500/30 p-3 sm:p-4 shadow-xl relative overflow-hidden">
      {/* Top Lowrider Chrome & Gold Pinstripe Accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background:
            'linear-gradient(90deg, #cbd5e1 0%, #f59e0b 25%, #ffffff 50%, #f59e0b 75%, #cbd5e1 100%)',
        }}
      />

      {/* Top Mixer Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 pt-1">
        <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-slate-200">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>100-SPOKE PRO MIXER</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-mono">CURVE:</span>
          <div className="flex bg-slate-950 p-0.5 rounded-md border border-slate-800">
            {(['smooth', 'cut', 'linear'] as CrossfaderCurve[]).map((c) => (
              <button
                key={c}
                onClick={() => onCurveChange(c)}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-colors ${
                  curve === c
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Dual-Deck Frequency Spectrum Analyzer (Deck A vs Deck B) */}
      <div className="bg-slate-950 rounded-xl p-2.5 mb-3 border border-slate-800 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 font-black text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              DECK A IN: {levelA}%
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 font-black text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              DECK B IN: {levelB}%
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {(
              [
                { id: 'split', label: 'Split A | B' },
                { id: 'overlay', label: 'EQ Curve Overlay' },
                { id: 'mirror', label: 'Horizon Mirror' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSpectrumMode(mode.id)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors whitespace-nowrap ${
                  spectrumMode === mode.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full h-24 sm:h-28 rounded-lg overflow-hidden border border-slate-800/90 bg-slate-950">
          <canvas
            ref={spectrumCanvasRef}
            width={640}
            height={112}
            className="w-full h-full block"
          />
          {/* Frequency Band Reference Markers */}
          <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[8px] font-mono text-slate-400/80 pointer-events-none select-none">
            <span>60Hz SUB</span>
            <span>250Hz LOW</span>
            <span>1kHz MID</span>
            <span>4kHz PRES</span>
            <span>12kHz AIR</span>
          </div>
        </div>
      </div>

      {/* 2 Channels Split: Channel A (Left) & Channel B (Right) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
        {/* Channel A Column */}
        <div className="flex flex-col items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-black text-rose-400">CH A</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => deckAFileRef.current?.click()}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Upload Music to Deck A"
              >
                <Upload className="w-3 h-3" />
              </button>
              <button
                onClick={() => engine.downloadDeckTrackWav('A')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400"
                title="Download Deck A WAV"
              >
                <Download className="w-3 h-3" />
              </button>
              <input
                ref={deckAFileRef}
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const custom = await engine.loadCustomAudioFile(f, 'A');
                    if (custom) onAddTrackToLibrary(custom);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* 3-Band EQ Knobs */}
          <div className="w-full space-y-1.5 mb-2.5">
            {(['high', 'mid', 'low'] as const).map((band) => {
              const isKill =
                band === 'high'
                  ? engine.deckAState.eq.killHigh
                  : band === 'mid'
                  ? engine.deckAState.eq.killMid
                  : engine.deckAState.eq.killLow;
              const val = engine.deckAState.eq[band];
              return (
                <div key={band} className="flex flex-col items-center">
                  <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="uppercase">{band === 'high' ? 'HI' : band}</span>
                    <span className="tabular-nums">{isKill ? 'KILL' : `${val}dB`}</span>
                  </div>
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="range"
                      min={-24}
                      max={6}
                      step={1}
                      value={val}
                      onChange={(e) => engine.setEQ('A', band, parseFloat(e.target.value))}
                      className="dj-slider flex-1 h-4"
                    />
                    <button
                      onClick={() => engine.toggleEQKill('A', band)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
                        isKill
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      K
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Sweep */}
          <div className="w-full mb-2.5 p-1.5 bg-slate-900 rounded-lg border border-slate-800 flex flex-col items-center">
            <div className="flex justify-between w-full text-[10px] font-mono text-slate-300 mb-0.5">
              <span>FILTER</span>
              <button
                onClick={() => engine.setFilter('A', 0)}
                className="text-[9px] text-amber-400 hover:underline font-mono"
              >
                {engine.deckAState.filter === 0
                  ? 'BYPASS'
                  : engine.deckAState.filter < 0
                  ? `LPF ${engine.deckAState.filter}`
                  : `HPF +${engine.deckAState.filter}`}
              </button>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={engine.deckAState.filter}
              onChange={(e) => engine.setFilter('A', parseFloat(e.target.value))}
              className="dj-slider w-full h-4"
            />
          </div>

          {/* Channel Fader & Meter */}
          <div className="flex items-center gap-2 h-28">
            <div className="w-2.5 h-24 bg-slate-900 rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-slate-800">
              <div
                className="w-full rounded-full transition-all duration-75"
                style={{
                  height: `${levelA}%`,
                  backgroundColor: levelA > 85 ? '#ef4444' : levelA > 65 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={engine.deckAState.volume}
                onChange={(e) => engine.setDeckVolume('A', parseFloat(e.target.value))}
                className="dj-slider -rotate-90 w-24 h-6"
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
            VOL A · {Math.round(engine.deckAState.volume * 100)}%
          </span>
        </div>

        {/* Channel B Column */}
        <div className="flex flex-col items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-black text-blue-400">CH B</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => deckBFileRef.current?.click()}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Upload Music to Deck B"
              >
                <Upload className="w-3 h-3" />
              </button>
              <button
                onClick={() => engine.downloadDeckTrackWav('B')}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400"
                title="Download Deck B WAV"
              >
                <Download className="w-3 h-3" />
              </button>
              <input
                ref={deckBFileRef}
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const custom = await engine.loadCustomAudioFile(f, 'B');
                    if (custom) onAddTrackToLibrary(custom);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* 3-Band EQ Knobs */}
          <div className="w-full space-y-1.5 mb-2.5">
            {(['high', 'mid', 'low'] as const).map((band) => {
              const isKill =
                band === 'high'
                  ? engine.deckBState.eq.killHigh
                  : band === 'mid'
                  ? engine.deckBState.eq.killMid
                  : engine.deckBState.eq.killLow;
              const val = engine.deckBState.eq[band];
              return (
                <div key={band} className="flex flex-col items-center">
                  <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 mb-0.5">
                    <span className="uppercase">{band === 'high' ? 'HI' : band}</span>
                    <span className="tabular-nums">{isKill ? 'KILL' : `${val}dB`}</span>
                  </div>
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="range"
                      min={-24}
                      max={6}
                      step={1}
                      value={val}
                      onChange={(e) => engine.setEQ('B', band, parseFloat(e.target.value))}
                      className="dj-slider flex-1 h-4"
                    />
                    <button
                      onClick={() => engine.toggleEQKill('B', band)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
                        isKill
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      K
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filter Sweep */}
          <div className="w-full mb-2.5 p-1.5 bg-slate-900 rounded-lg border border-slate-800 flex flex-col items-center">
            <div className="flex justify-between w-full text-[10px] font-mono text-slate-300 mb-0.5">
              <span>FILTER</span>
              <button
                onClick={() => engine.setFilter('B', 0)}
                className="text-[9px] text-amber-400 hover:underline font-mono"
              >
                {engine.deckBState.filter === 0
                  ? 'BYPASS'
                  : engine.deckBState.filter < 0
                  ? `LPF ${engine.deckBState.filter}`
                  : `HPF +${engine.deckBState.filter}`}
              </button>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={engine.deckBState.filter}
              onChange={(e) => engine.setFilter('B', parseFloat(e.target.value))}
              className="dj-slider w-full h-4"
            />
          </div>

          {/* Channel Fader & Meter */}
          <div className="flex items-center gap-2 h-28">
            <div className="w-2.5 h-24 bg-slate-900 rounded-full overflow-hidden flex flex-col-reverse p-0.5 border border-slate-800">
              <div
                className="w-full rounded-full transition-all duration-75"
                style={{
                  height: `${levelB}%`,
                  backgroundColor: levelB > 85 ? '#ef4444' : levelB > 65 ? '#f59e0b' : '#3b82f6',
                }}
              />
            </div>
            <div className="relative h-24 flex items-center justify-center">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={engine.deckBState.volume}
                onChange={(e) => engine.setDeckVolume('B', parseFloat(e.target.value))}
                className="dj-slider -rotate-90 w-24 h-6"
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
            VOL B · {Math.round(engine.deckBState.volume * 100)}%
          </span>
        </div>
      </div>

      {/* Master Crossfader & Auto-Mix / Censor Bleep Strip */}
      <div className="bg-slate-950 rounded-xl p-2.5 mb-3 border border-slate-800 shadow-inner">
        <div className="flex justify-between items-center text-[10px] font-black tracking-wider mb-1.5">
          <span className="text-rose-400">DECK A</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onCrossfaderChange(0)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
            >
              CENTER
            </button>
            <button
              onClick={() => engine.triggerAutoCrossfade(4.0)}
              disabled={engine.isAutoCrossfading}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono"
              title="Smooth 4-Second Automated Transition"
            >
              {engine.isAutoCrossfading ? 'MIXING...' : 'AUTO-MIX'}
            </button>
            <button
              onPointerDown={() => engine.setCensorBleep(true)}
              onPointerUp={() => engine.setCensorBleep(false)}
              onPointerLeave={() => engine.setCensorBleep(false)}
              className={`px-2 py-0.5 rounded font-mono flex items-center gap-1 ${
                engine.isCensorBleepActive
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
              }`}
              title="Hold to Censor Bleep Explicit Lyrics on TikTok LIVE"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>BLEEP</span>
            </button>
          </div>
          <span className="text-blue-400">DECK B</span>
        </div>

        <div className="px-1 py-0.5">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="crossfader-slider w-full h-7"
          />
        </div>
      </div>

      {/* Master 808 Sub Enhancer, Vinyl Crackle & Broadcast Bus Meter */}
      <div className="bg-slate-950/90 rounded-xl p-2.5 mb-3 border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MASTER STREAM BUS</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => engine.toggleVinylCrackle()}
              className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                engine.vinylCrackleEnabled
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle Warm 90s Vinyl Surface Crackle"
            >
              VINYL WARMTH {engine.vinylCrackleEnabled ? 'ON' : 'OFF'}
            </button>
            <span className="text-emerald-400 font-bold tabular-nums">
              {levelMaster > 90 ? 'PEAK' : `${levelMaster}%`}
            </span>
          </div>
        </div>

        <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 flex items-center">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${levelMaster}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 70%, #ef4444 92%)',
            }}
          />
        </div>

        {/* 808 Sub Bass Boost Slider */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[10px] font-mono text-amber-400 whitespace-nowrap">
            808 SUB BOOST: +{engine.subBassBoostDb}dB
          </span>
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={engine.subBassBoostDb}
            onChange={(e) => engine.setSubBassBoost(parseFloat(e.target.value))}
            className="dj-slider flex-1 h-4"
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* INTEGRATED LOCAL MUSIC LIBRARY LIST IN MIXER                          */}
      {/* ===================================================================== */}
      <div className="bg-slate-950 rounded-xl p-3 mb-3 border border-amber-500/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-black tracking-wide text-white uppercase">
              Local Music Library Crate ({availableTracks.length})
            </span>
          </div>
          <button
            onClick={() => libraryFileInputRef.current?.click()}
            disabled={isImportingFiles}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            title="Import multiple MP3, WAV, FLAC, OGG, or M4A music files from your device"
          >
            <FolderPlus className="w-3 h-3" />
            <span>{isImportingFiles ? 'IMPORTING...' : '+ IMPORT LOCAL FILES'}</span>
          </button>
          <input
            ref={libraryFileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleBatchLibraryImport}
            className="hidden"
          />
        </div>

        {/* Search Input + Genre / Source Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search tracks, BPM, genre..."
              className="w-full h-7 pl-7 pr-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'local', label: 'My Files' },
                { id: 'funk', label: 'Lowrider/Funk' },
                { id: 'slowjam', label: '90s Slow Jam' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLibraryFilter(tab.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap ${
                  libraryFilter === tab.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Track Crate List */}
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
          {filteredTracks.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800/80">
              No tracks match filter. Click <strong>+ IMPORT LOCAL FILES</strong> to load MP3/WAV songs!
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isOnDeckA = engine.deckAState.track?.id === track.id;
              const isOnDeckB = engine.deckBState.track?.id === track.id;
              const isLocalUpload =
                track.id.startsWith('local_') || track.id.startsWith('custom_');

              return (
                <div
                  key={track.id}
                  className={`p-2 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                    isOnDeckA || isOnDeckB
                      ? 'bg-slate-900 border-amber-500/50'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-100 truncate">
                        {track.title}
                      </span>
                      {isLocalUpload && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-300 shrink-0">
                          LOCAL
                        </span>
                      )}
                      {isOnDeckA && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/40 text-[9px] font-mono font-bold text-rose-300 shrink-0">
                          DECK A
                        </span>
                      )}
                      {isOnDeckB && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 border border-blue-500/40 text-[9px] font-mono font-bold text-blue-300 shrink-0">
                          DECK B
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 truncate tabular-nums">
                      <span className="truncate">{track.genre}</span>
                      <span>·</span>
                      <span className="text-amber-400 font-bold">{track.bpm} BPM</span>
                      <span>·</span>
                      <span>{track.key}</span>
                      <span>·</span>
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>

                  {/* Quick Deck Load & WAV Download Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => engine.loadTrack('A', track)}
                      className={`h-7 px-2 rounded-lg text-[10px] font-black transition-colors whitespace-nowrap ${
                        isOnDeckA
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30'
                      }`}
                      title="Load Track onto Deck A"
                    >
                      LOAD A
                    </button>
                    <button
                      onClick={() => engine.loadTrack('B', track)}
                      className={`h-7 px-2 rounded-lg text-[10px] font-black transition-colors whitespace-nowrap ${
                        isOnDeckB
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30'
                      }`}
                      title="Load Track onto Deck B"
                    >
                      LOAD B
                    </button>
                    <button
                      onClick={() => {
                        if (track.buffer) {
                          const safeName = track.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          downloadAudioBufferAsWav(track.buffer, `${safeName}.wav`);
                        }
                      }}
                      className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center justify-center"
                      title="Download Track as WAV"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VOICE CLIP RECORDER, VOICE FX & 6 SWAPPABLE VOICE SLOTS               */}
      {/* ===================================================================== */}
      <div className="bg-slate-950 rounded-xl p-3 border border-amber-500/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-black tracking-wide text-white">
              VOICE CLIP RECORDER &amp; FX DECK
            </span>
          </div>
          <button
            onClick={() => engine.toggleMicrophone()}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
              engine.micActive
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {engine.micActive ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            <span>{engine.micActive ? 'MIC LIVE' : 'TALKOVER MIC'}</span>
          </button>
        </div>

        {/* Voice FX Selector Buttons */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>VOICE FX PROCESSOR</span>
            </span>
            <span className="text-amber-400 uppercase font-bold">{engine.voiceSamplerFx}</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
            {VOICE_FX_LIST.map((fx) => (
              <button
                key={fx.id}
                onClick={() => engine.setMicEffect(fx.id)}
                className={`py-1 px-1.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap ${
                  engine.voiceSamplerFx === fx.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {fx.label}
              </button>
            ))}
          </div>
        </div>

        {/* Swap Instructions Banner */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <span>
            {swapSourceIndex !== null
              ? `Swapping Slot #${swapSourceIndex + 1} — Tap another slot to swap positions!`
              : '6 Swappable Voice Clip Slots · Record, Play, Upload, Download or Swap'}
          </span>
          {swapSourceIndex !== null && (
            <button
              onClick={() => setSwapSourceIndex(null)}
              className="text-rose-400 font-bold hover:underline ml-2"
            >
              Cancel
            </button>
          )}
        </div>

        {/* 6 Swappable Voice Clip Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {engine.voiceClipSlots.map((slot, idx) => {
            const isSelectedForSwap = swapSourceIndex === idx;
            return (
              <div
                key={slot.id}
                onClick={() => {
                  if (swapSourceIndex !== null && swapSourceIndex !== idx) {
                    handleSlotSwapClick(idx);
                  }
                }}
                className={`p-2 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                  isSelectedForSwap
                    ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400'
                    : swapSourceIndex !== null
                    ? 'bg-slate-900/90 border-amber-500/50 cursor-pointer hover:bg-slate-800'
                    : slot.isRecording
                    ? 'bg-rose-950/60 border-rose-500'
                    : slot.isPlaying
                    ? 'bg-emerald-950/50 border-emerald-500/80'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                {/* Slot Top Row: Slot Badge + Editable Label + Duration */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white shrink-0"
                      style={{ backgroundColor: slot.color }}
                    >
                      {slot.slotNumber}
                    </span>
                    <input
                      type="text"
                      value={slot.label}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => engine.renameVoiceSlot(idx, e.target.value)}
                      className="bg-transparent text-[11px] font-bold text-slate-100 truncate focus:outline-none focus:border-b border-amber-400 w-full"
                      title="Click to rename voice clip slot"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 tabular-nums shrink-0">
                    {slot.isRecording ? 'REC...' : `${slot.duration.toFixed(1)}s`}
                  </span>
                </div>

                {/* Slot Action Controls: Play, Record, Upload, Download, Swap */}
                <div
                  className="grid grid-cols-5 gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Play Clip */}
                  <button
                    onClick={() => engine.playVoiceSlot(idx)}
                    disabled={!slot.buffer || slot.isRecording}
                    className={`h-7 rounded flex items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                      slot.isPlaying
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
                    }`}
                    title="Play Voice Clip through Voice FX"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>PLAY</span>
                  </button>

                  {/* Record Mic Clip */}
                  <button
                    onClick={() => engine.toggleRecordVoiceSlot(idx)}
                    className={`h-7 rounded flex items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                      slot.isRecording
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700'
                    }`}
                    title="Record short voice clip into this slot"
                  >
                    {slot.isRecording ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-current" />
                        <span>STOP</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3" />
                        <span>REC</span>
                      </>
                    )}
                  </button>

                  {/* Upload Audio to Slot */}
                  <button
                    onClick={() => {
                      setUploadTargetSlot(idx);
                      slotFileInputRef.current?.click();
                    }}
                    className="h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center"
                    title="Upload audio file into this voice slot"
                  >
                    <Upload className="w-3 h-3" />
                  </button>

                  {/* Download Slot as WAV */}
                  <button
                    onClick={() => engine.downloadVoiceSlotWav(idx)}
                    disabled={!slot.buffer}
                    className="h-7 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 border border-slate-700 flex items-center justify-center"
                    title="Download this voice clip as WAV"
                  >
                    <Download className="w-3 h-3" />
                  </button>

                  {/* Swap Slot Position */}
                  <button
                    onClick={() => handleSlotSwapClick(idx)}
                    className={`h-7 rounded flex items-center justify-center border transition-colors ${
                      isSelectedForSwap
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title="Swap this voice clip slot with another slot"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <input
          ref={slotFileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleSlotFileUpload}
          className="hidden"
        />

        {/* Master Set Record & Download Button directly on Mixer */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            onClick={() => engine.toggleRecording()}
            className={`flex-1 h-9 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-colors ${
              engine.isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
          >
            <Disc className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {engine.isRecording
                ? 'STOP & DOWNLOAD LIVE MIX RECORDING'
                : 'RECORD & DOWNLOAD MASTER DJ MIX'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

