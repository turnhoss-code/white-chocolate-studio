/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Fullscreen TikTok Stream Overlay & Reactive Visualizer
 */

import React, { useEffect, useRef, useState } from 'react';
import { DJEngine } from '../audio/DJEngine';
import { Radio, X, Volume2, Sparkles } from 'lucide-react';

interface StreamOverlayProps {
  engine: DJEngine;
  onClose: () => void;
}

export const StreamOverlay: React.FC<StreamOverlayProps> = ({ engine, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamTime, setStreamTime] = useState('00:00:00');
  const startTimeRef = useRef(Date.now());

  // Clock
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setStreamTime(
        `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Audio Reactive Spectrum
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(64);

    const render = () => {
      if (engine.masterAnalyser) {
        engine.masterAnalyser.getByteFrequencyData(dataArray);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / 48;
      for (let i = 0; i < 48; i++) {
        const val = dataArray[i] || 0;
        const barHeight = (val / 255) * canvas.height * 0.9;
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        // Gradient from amber to rose to violet
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, y);
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#a855f7');

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  const activeTrack =
    engine.crossfader <= 0
      ? engine.deckAState.track || engine.deckBState.track
      : engine.deckBState.track || engine.deckAState.track;

  const activeDeckId = engine.crossfader <= 0 ? 'A' : 'B';
  const activeDeckState = activeDeckId === 'A' ? engine.deckAState : engine.deckBState;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none">
      {/* Optional AI-Animated Video Backdrop (gemini-omni-1.1-flash) */}
      {engine.customVideoUrl && (
        <video
          src={engine.customVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-55 pointer-events-none"
        />
      )}

      {/* Measured Contrast Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/70 pointer-events-none" />

      {/* Top Stream Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-black tracking-wider">
            <Radio className="w-3.5 h-3.5" />
            <span>TIKTOK LIVE</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-300 tabular-nums">
            SET TIME: {streamTime}
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Exit Overlay</span>
        </button>
      </div>

      {/* Centerpiece: Spinning Iconic Platter Artwork */}
      <div className="relative flex flex-col items-center justify-center my-auto z-10">
        {/* Glow Halo */}
        <div className="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />

        {/* Large Vinyl Record */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full vinyl-texture border-4 border-slate-700 shadow-2xl flex items-center justify-center">
          <div className="absolute inset-0 rounded-full vinyl-sheen opacity-50" />

          {/* Rotating Artwork */}
          <div
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-amber-400/80 shadow-2xl transition-transform"
            style={{
              transform: `rotate(${activeDeckState.rotationAngle}deg)`,
              transition: 'transform 0.05s linear'
            }}
          >
            <img
              src={activeTrack?.coverImage || engine.customCoverUrl}
              alt="White Chocolate Studio"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Spindle */}
          <div className="absolute w-5 h-5 rounded-full bg-black border-2 border-slate-300 shadow-inner" />
        </div>

        {/* Brand Wordmark Title */}
        <div className="mt-4 text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-wider bg-gradient-to-r from-amber-200 via-rose-300 to-amber-100 bg-clip-text text-transparent uppercase font-display drop-shadow">
            White Chocolate Studio
          </h1>
          <p className="text-xs text-rose-400 font-mono tracking-widest mt-0.5">
            LIVE STREAM DJ MIX · {activeDeckState.effectiveBpm} BPM
          </p>
        </div>
      </div>

      {/* Bottom: Frequency Spectrum Visualizer & Now Playing Card */}
      <div className="space-y-3 z-10 w-full max-w-xl mx-auto">
        {/* Live Audio Reactive Spectrum Canvas */}
        <div className="w-full h-16 sm:h-20 bg-slate-950/75 rounded-xl border border-slate-800/80 p-1 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={480}
            height={80}
            className="w-full h-full block"
          />
        </div>

        {/* Now Playing Banner */}
        <div className="p-3 bg-slate-900/95 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-700">
              <img
                src={activeTrack?.coverImage || engine.customCoverUrl}
                alt="Track Cover"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-xs">
                {activeTrack?.title || 'White Chocolate Studio Mix'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {activeTrack?.genre || 'Club DJ Set'} · {activeTrack?.key || 'Live'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-black font-mono text-emerald-400 tabular-nums">
              {activeDeckState.effectiveBpm} BPM
            </span>
            <div className="text-[10px] text-slate-500 font-mono">
              DECK {activeDeckId} LIVE
            </div>
          </div>
        </div>

        {/* Soundboard Quick Drop Bar */}
        <div className="flex items-center justify-center gap-2">
          {['airhorn', 'sub_boom', 'money_cash', 'damn_vocal'].map((id) => (
            <button
              key={id}
              onClick={() => engine.triggerSoundboard(id)}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 active:scale-95 transition-all shadow-md"
            >
              {id === 'airhorn' ? '📢 AIRHORN' : id === 'sub_boom' ? '💥 808' : id === 'money_cash' ? '🤑 $$' : '🗣️ DAMN!'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
