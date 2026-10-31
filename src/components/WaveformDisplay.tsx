/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Waveform Visualizer Canvas
 */

import React, { useEffect, useRef } from 'react';
import { TrackMetadata } from '../audio/proceduralTracks';

interface WaveformDisplayProps {
  track: TrackMetadata | null;
  currentTime: number;
  duration: number;
  cuePoint: number;
  hotCues: (number | null)[];
  color: string;
  onSeek: (time: number) => void;
  height?: number;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  track,
  currentTime,
  duration,
  cuePoint,
  hotCues,
  color,
  onSeek,
  height = 54
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, h);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (!track || !track.waveformData || duration === 0) {
      // Empty placeholder
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('NO TRACK LOADED', width / 2, h / 2 + 4);
      return;
    }

    const waveform = track.waveformData;
    const barWidth = width / waveform.length;
    const progressNorm = Math.min(1, Math.max(0, currentTime / duration));
    const playheadX = progressNorm * width;

    // Draw waveform bars
    for (let i = 0; i < waveform.length; i++) {
      const x = i * barWidth;
      const val = waveform[i];
      const barH = Math.max(4, val * (h * 0.85));
      const y = (h - barH) / 2;

      // Color active vs upcoming
      if (x <= playheadX) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      }

      ctx.fillRect(x, y, Math.max(1.5, barWidth - 1), barH);
    }

    // Cue Point flag
    if (cuePoint >= 0) {
      const cueX = (cuePoint / duration) * width;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cueX - 1, 0, 2, h);
      // Cue flag triangle
      ctx.beginPath();
      ctx.moveTo(cueX - 4, 0);
      ctx.lineTo(cueX + 4, 0);
      ctx.lineTo(cueX, 8);
      ctx.fill();
    }

    // Hot Cue flags
    const hotCueColors = ['#ef4444', '#3b82f6', '#10b981', '#a855f7'];
    hotCues.forEach((hc, idx) => {
      if (hc !== null) {
        const hcX = (hc / duration) * width;
        ctx.fillStyle = hotCueColors[idx] || '#f59e0b';
        ctx.fillRect(hcX - 1, 0, 2, h);
        ctx.fillRect(hcX - 3, h - 8, 6, 8);
      }
    });

    // Playhead Line
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillRect(playheadX - 1, 0, 2, h);
    ctx.shadowBlur = 0;

    // Time text on bottom right
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    const remTime = Math.max(0, duration - currentTime);
    const m = Math.floor(remTime / 60);
    const s = Math.floor(remTime % 60);
    ctx.fillText(`-${m}:${s < 10 ? '0' : ''}${s}`, width - 6, h - 6);
  }, [track, currentTime, duration, cuePoint, hotCues, color, height]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950/80 shadow-inner">
      <canvas
        ref={canvasRef}
        width={360}
        height={height}
        onPointerDown={handlePointerDown}
        className="w-full h-auto cursor-pointer block touch-none"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
