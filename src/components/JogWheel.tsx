/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Interactive Touch DJ Jog Wheel / Vinyl Turntable
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface JogWheelProps {
  deckId: 'A' | 'B';
  isPlaying: boolean;
  isScratching: boolean;
  rotationAngle: number;
  bpm: number;
  color: string;
  coverImage?: string;
  onScratchStart: () => void;
  onScratchMove: (deltaDegrees: number) => void;
  onScratchEnd: () => void;
  onPitchNudge: (dir: 'plus' | 'minus') => void;
}

export const JogWheel: React.FC<JogWheelProps> = ({
  deckId,
  isScratching,
  rotationAngle,
  color,
  coverImage,
  onScratchStart,
  onScratchMove,
  onScratchEnd,
  onPitchNudge
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [touchActive, setTouchActive] = useState(false);
  const lastAngleRef = useRef<number | null>(null);
  const [mode, setMode] = useState<'vinyl' | 'bend'>('vinyl');

  const calculateAngle = useCallback((clientX: number, clientY: number): number => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - centerY, clientX - centerX);
    return (rad * 180) / Math.PI; // -180 to 180
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setTouchActive(true);
    const angle = calculateAngle(e.clientX, e.clientY);
    lastAngleRef.current = angle;

    if (mode === 'vinyl') {
      onScratchStart();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchActive || lastAngleRef.current === null) return;
    e.preventDefault();
    const currentAngle = calculateAngle(e.clientX, e.clientY);
    let delta = currentAngle - lastAngleRef.current;

    // Handle wrap-around near 180 / -180
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngleRef.current = currentAngle;

    if (mode === 'vinyl') {
      onScratchMove(delta);
    } else {
      // Nudge mode
      if (delta > 2) onPitchNudge('plus');
      if (delta < -2) onPitchNudge('minus');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchActive) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setTouchActive(false);
    lastAngleRef.current = null;
    if (mode === 'vinyl') {
      onScratchEnd();
    }
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Platter Container */}
      <div className="relative p-2 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-black shadow-2xl border border-slate-700/80">
        {/* Outer Strobe Rim */}
        <div
          ref={wheelRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 rounded-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-center vinyl-texture border-2 border-slate-700 shadow-inner overflow-hidden"
          style={{
            touchAction: 'none'
          }}
        >
          {/* Subtle Vinyl Grooves Radial Circles */}
          <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />
          <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-11 rounded-full border border-white/10 pointer-events-none" />

          {/* Light Sheen Reflection Overlay */}
          <div className="absolute inset-0 rounded-full vinyl-sheen opacity-60 pointer-events-none" />

          {/* Rotating Vinyl Disc Marker */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
              transition: isScratching ? 'none' : 'transform 0.05s linear'
            }}
          >
            {/* White Position Stripe on Rim (Cue marker) */}
            <div
              className="absolute top-1.5 w-1.5 h-6 rounded-sm shadow-md"
              style={{ backgroundColor: color }}
            />
            <div className="absolute bottom-1.5 w-1 h-3 rounded-sm bg-white/40" />

            {/* Center Record Label featuring White Chocolate Studio Logo or Custom Art */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-red-500 to-rose-600 shadow-xl border-2 border-slate-900 flex items-center justify-center overflow-hidden">
              <img
                src={coverImage || '/assets/aistudio/white_chocolate_studio_ce8a694c.JPG'}
                alt="White Chocolate Studio"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
                draggable={false}
              />
              {/* Spindle hole in center */}
              <div className="absolute w-4 h-4 rounded-full bg-slate-950 border border-slate-300 shadow-inner flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              </div>
            </div>
          </div>

          {/* Active Touch Halo */}
          {touchActive && (
            <div
              className="absolute inset-0 rounded-full border-2 pointer-events-none"
              style={{ borderColor: color, opacity: 0.85 }}
            />
          )}
        </div>

        {/* Deck Indicator Badge */}
        <div
          className="absolute -top-1 -left-1 px-2.5 py-0.5 rounded-md text-[11px] font-black tracking-wider text-white shadow-md border border-white/20"
          style={{ backgroundColor: color }}
        >
          DECK {deckId}
        </div>
      </div>

      {/* Mode & Nudge Quick Bar */}
      <div className="flex items-center gap-2 mt-2 w-full justify-between px-2">
        <button
          onClick={() => setMode(mode === 'vinyl' ? 'bend' : 'vinyl')}
          className={`px-2.5 py-1 text-[11px] font-bold rounded tracking-wide border transition-all ${
            mode === 'vinyl'
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-sm'
          }`}
          title="Toggle Vinyl Scratch vs CDJ Pitch Bend Mode"
        >
          {mode === 'vinyl' ? 'VINYL SCRATCH' : 'CDJ BEND'}
        </button>

        {/* Nudge buttons for quick beatmatching */}
        <div className="flex items-center gap-1">
          <button
            onPointerDown={() => onPitchNudge('minus')}
            className="w-8 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-xs font-mono font-bold"
            title="Pitch Nudge Down"
          >
            -
          </button>
          <button
            onPointerDown={() => onPitchNudge('plus')}
            className="w-8 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 text-xs font-mono font-bold"
            title="Pitch Nudge Up"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
