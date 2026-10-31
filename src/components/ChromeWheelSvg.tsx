/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - 100-Spoke Chrome Wire Wheel & Bullet Centercap SVG
 */

import React from 'react';

interface ChromeWheelSvgProps {
  size?: number;
  className?: string;
  accentColor?: string;
  goldNipples?: boolean;
  showWhitewall?: boolean;
  coverImageUrl?: string;
  rotationDeg?: number;
}

export const ChromeWheelSvg: React.FC<ChromeWheelSvgProps> = ({
  size = 220,
  className = '',
  accentColor = '#ef4444',
  goldNipples = true,
  showWhitewall = true,
  coverImageUrl,
  rotationDeg = 0,
}) => {
  // Generate 100 radial/tangent cross-laced spokes (50 inner-lace + 50 outer-lace)
  const spokes = React.useMemo(() => {
    const lines: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      nx: number;
      ny: number;
      layer: 'back' | 'front';
    }> = [];

    const cx = 150;
    const cy = 150;
    const hubRadius = 38;
    const rimRadius = 114;

    // 50 back-laced tangent spokes
    for (let i = 0; i < 50; i++) {
      const baseAngle = (i / 50) * Math.PI * 2;
      const hubAngle = baseAngle - 0.22;
      const rimAngle = baseAngle + 0.08;

      const x1 = cx + Math.cos(hubAngle) * hubRadius;
      const y1 = cy + Math.sin(hubAngle) * hubRadius;
      const x2 = cx + Math.cos(rimAngle) * rimRadius;
      const y2 = cy + Math.sin(rimAngle) * rimRadius;
      const nx = cx + Math.cos(rimAngle) * (rimRadius - 4);
      const ny = cy + Math.sin(rimAngle) * (rimRadius - 4);

      lines.push({ x1, y1, x2, y2, nx, ny, layer: 'back' });
    }

    // 50 front-laced opposing tangent spokes (total = 100 spokes)
    for (let i = 0; i < 50; i++) {
      const baseAngle = ((i + 0.5) / 50) * Math.PI * 2;
      const hubAngle = baseAngle + 0.22;
      const rimAngle = baseAngle - 0.08;

      const x1 = cx + Math.cos(hubAngle) * (hubRadius - 4);
      const y1 = cy + Math.sin(hubAngle) * (hubRadius - 4);
      const x2 = cx + Math.cos(rimAngle) * rimRadius;
      const y2 = cy + Math.sin(rimAngle) * rimRadius;
      const nx = cx + Math.cos(rimAngle) * (rimRadius - 4);
      const ny = cy + Math.sin(rimAngle) * (rimRadius - 4);

      lines.push({ x1, y1, x2, y2, nx, ny, layer: 'front' });
    }

    return lines;
  }, []);

  const clipId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      className={`select-none pointer-events-none ${className}`}
      style={{
        transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
      }}
    >
      <defs>
        {/* Deep Dish Chrome Lip Gradient */}
        <linearGradient id={`chrome-lip-${clipId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="18%" stopColor="#94a3b8" />
          <stop offset="35%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="68%" stopColor="#e2e8f0" />
          <stop offset="85%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>

        {/* Chrome Spoke Gradient */}
        <linearGradient id={`chrome-spoke-${clipId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* 3D Bullet Centercap Cone Gradient */}
        <radialGradient id={`bullet-cap-${clipId}`} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="28%" stopColor="#e2e8f0" />
          <stop offset="55%" stopColor="#64748b" />
          <stop offset="82%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>

        {/* Gold Nipple Ring Gradient */}
        <linearGradient id={`gold-accent-${clipId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <clipPath id={`cover-clip-${clipId}`}>
          <circle cx="150" cy="150" r="88" />
        </clipPath>
      </defs>

      {/* Outer Lowrider Tire & Whitewall Stripe */}
      {showWhitewall && (
        <>
          <circle cx="150" cy="150" r="147" fill="#090d16" stroke="#1e293b" strokeWidth="3" />
          {/* Classic Lowrider Whitewall Ring */}
          <circle cx="150" cy="150" r="136" fill="none" stroke="#f8fafc" strokeWidth="7" opacity="0.92" />
          {/* Thin Gold/Candy Pinstripe inside Whitewall */}
          <circle cx="150" cy="150" r="129" fill="none" stroke={accentColor} strokeWidth="2" opacity="0.85" />
        </>
      )}

      {/* Deep-Dish Chrome Outer Rim Barrel */}
      <circle
        cx="150"
        cy="150"
        r="124"
        fill="#050811"
        stroke={`url(#chrome-lip-${clipId})`}
        strokeWidth="12"
      />
      <circle
        cx="150"
        cy="150"
        r="116"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.7"
      />

      {/* Optional Vinyl Cover Image Under the 100 Spokes */}
      {coverImageUrl && (
        <g clipPath={`url(#cover-clip-${clipId})`} opacity="0.45">
          <image
            href={coverImageUrl}
            x="62"
            y="62"
            width="176"
            height="176"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}

      {/* Subtle Brake Rotor & Candy Caliper Behind Spokes */}
      <circle cx="150" cy="150" r="76" fill="none" stroke="#334155" strokeWidth="10" opacity="0.45" />
      <circle cx="150" cy="150" r="76" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 6" />

      {/* Back Layer: 50 Spokes */}
      <g opacity="0.78">
        {spokes
          .filter((s) => s.layer === 'back')
          .map((s, idx) => (
            <line
              key={`b-${idx}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#94a3b8"
              strokeWidth="1.15"
            />
          ))}
      </g>

      {/* Front Layer: 50 Opposing Chrome Spokes (Total = 100 Spokes) */}
      <g opacity="0.96">
        {spokes
          .filter((s) => s.layer === 'front')
          .map((s, idx) => (
            <React.Fragment key={`f-${idx}`}>
              <line
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={`url(#chrome-spoke-${clipId})`}
                strokeWidth="1.35"
              />
              {/* 24K Gold or Chrome Spoke Nipples along outer dish */}
              <circle
                cx={s.nx}
                cy={s.ny}
                r="1.6"
                fill={goldNipples ? '#fbbf24' : '#f8fafc'}
              />
            </React.Fragment>
          ))}
      </g>

      {/* Scratch Cue Position Marker on Rim */}
      <rect x="147" y="24" width="6" height="16" rx="2" fill={accentColor} />

      {/* Chrome Center Hub Barrel */}
      <circle
        cx="150"
        cy="150"
        r="41"
        fill="#0f172a"
        stroke={`url(#chrome-lip-${clipId})`}
        strokeWidth="6"
      />
      <circle
        cx="150"
        cy="150"
        r="34"
        fill="none"
        stroke={goldNipples ? `url(#gold-accent-${clipId})` : '#e2e8f0'}
        strokeWidth="2.5"
      />

      {/* 3-Prong Knock-Off Spinner Wings Behind Bullet Cap */}
      {[0, 120, 240].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 150 150)`}>
          <path
            d="M 144 120 L 147 92 L 153 92 L 156 120 Z"
            fill={`url(#chrome-lip-${clipId})`}
            stroke="#475569"
            strokeWidth="0.8"
          />
        </g>
      ))}

      {/* Iconic Lowrider Chrome Bullet Centercap */}
      <circle
        cx="150"
        cy="150"
        r="25"
        fill={`url(#bullet-cap-${clipId})`}
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      {/* Bullet Cone Concentric Machined Rings */}
      <circle cx="150" cy="150" r="16" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <circle
        cx="150"
        cy="150"
        r="9"
        fill={`url(#bullet-cap-${clipId})`}
        stroke="#ffffff"
        strokeWidth="1"
      />
      {/* Sharp Chrome Bullet Tip Highlight */}
      <circle cx="148" cy="148" r="3.2" fill="#ffffff" />
    </svg>
  );
};
