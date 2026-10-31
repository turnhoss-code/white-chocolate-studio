/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - 100-Spoke Chrome Wheel & Vinyl Scratch Platter
 */

import React, { useRef, useState, useCallback } from 'react';
import { ChromeWheelSvg } from './ChromeWheelSvg';
import { STUDIO_ICON_URL } from '../audio/proceduralTracks';

interface JogWheelProps {
  deckId: 'A' | 'B';
  isPlaying: boolean;
  isScratching: boolean;
  rotationAngle: number;
  bpm: number;
  color: string;
  coverImage?: string;
  platterStyle?: 'chrome_100_spoke' | 'vinyl';
  onTogglePlatterStyle?: () => void;
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
  platterStyle = 'chrome_100_spoke',
  onTogglePlatterStyle,
  onScratchStart,
  onScratchMove,
  onScratchEnd,
  onPitchNudge,
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
    return (rad * 180) / Math.PI;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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

    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    lastAngleRef.current = currentAngle;

    if (mode === 'vinyl') {
      onScratchMove(delta);
    } else {
      if (delta > 2) onPitchNudge('plus');
      if (delta < -2) onPitchNudge('minus');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touchActive) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
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
      {/* Platter Outer Chrome Bezel */}
      <div className="relative p-1.5 rounded-full bg-gradient-to-b from-slate-300 via-slate-700 to-slate-950 shadow-2xl border border-slate-500/80">
        {/* Interactive Touch Platter */}
        <div
          ref={wheelRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-54 md:h-54 rounded-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-center vinyl-texture border-2 border-slate-600 shadow-inner overflow-hidden"
          style={{
            touchAction: 'none',
          }}
        >
          {platterStyle === 'chrome_100_spoke' ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                transition: isScratching ? 'none' : 'transform 0.05s linear',
              }}
            >
              <ChromeWheelSvg
                size={216}
                accentColor={color}
                goldNipples={true}
                showWhitewall={true}
                coverImageUrl={coverImage || STUDIO_ICON_URL}
              />
            </div>
          ) : (
            <>
              <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-11 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-0 rounded-full vinyl-sheen opacity-60 pointer-events-none" />

              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  transition: isScratching ? 'none' : 'transform 0.05s linear',
                }}
              >
                <div
                  className="absolute top-1.5 w-1.5 h-6 rounded-sm shadow-md"
                  style={{ backgroundColor: color }}
                />
                <div className="absolute bottom-1.5 w-1 h-3 rounded-sm bg-white/40" />

                {/* Center Record Label with Chrome Bullet Cap Spindle */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-amber-500 via-red-500 to-rose-600 shadow-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden">
                  <img
                    src={coverImage || STUDIO_ICON_URL}
                    alt="White Chocolate Studio"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full"
                    draggable={false}
                  />
                  {/* Chrome Bullet Centercap Spindle */}
                  <div className="absolute w-6 h-6 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-700 border border-white shadow-md flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Active Scratch Touch Halo */}
          {touchActive && (
            <div
              className="absolute inset-0 rounded-full border-2 pointer-events-none"
              style={{ borderColor: color, opacity: 0.9 }}
            />
          )}
        </div>

        {/* Deck Indicator Chrome Badge */}
        <div
          className="absolute -top-1 -left-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider text-white shadow-md border border-slate-300/60"
          style={{ backgroundColor: color }}
        >
          DECK {deckId}
        </div>

        {/* 100-Spoke / Vinyl Platter Switcher Badge */}
        {onTogglePlatterStyle && (
          <button
            onClick={onTogglePlatterStyle}
            className="absolute -top-1 -right-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 shadow-md transition-colors"
            title="Switch between 100-Spoke Chrome Wheel & Classic Vinyl Platter"
          >
            {platterStyle === 'chrome_100_spoke' ? '100-SPOKE' : 'VINYL'}
          </button>
        )}
      </div>

      {/* Mode & Pitch Nudge Bar */}
      <div className="flex items-center gap-1.5 mt-2 w-full justify-between px-1">
        <button
          onClick={() => setMode(mode === 'vinyl' ? 'bend' : 'vinyl')}
          className={`px-2 py-1 text-[10px] font-bold rounded tracking-wide border transition-all whitespace-nowrap ${
            mode === 'vinyl'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
          }`}
          title="Toggle Scratch vs Pitch Bend Mode"
        >
          {mode === 'vinyl' ? 'SCRATCH' : 'PITCH BEND'}
        </button>

        <div className="flex items-center gap-1">
          <button
            onPointerDown={() => onPitchNudge('minus')}
            className="w-7 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-mono font-bold"
            title="Pitch Nudge Down"
          >
            -
          </button>
          <button
            onPointerDown={() => onPitchNudge('plus')}
            className="w-7 h-6 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-mono font-bold"
            title="Pitch Nudge Up"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
