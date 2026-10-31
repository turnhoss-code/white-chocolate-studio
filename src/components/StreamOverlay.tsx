/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Fullscreen TikTok LIVE & OBS Stream Overlay with 100-Spoke Chrome Wheel
 */

import React, { useEffect, useRef, useState } from 'react';
import { DJEngine } from '../audio/DJEngine';
import { ChromeWheelSvg } from './ChromeWheelSvg';
import { STUDIO_ICON_URL } from '../audio/proceduralTracks';
import { Radio, X, Sliders, Gift, Users, Heart, Mic } from 'lucide-react';

interface StreamOverlayProps {
  engine: DJEngine;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const StreamOverlay: React.FC<StreamOverlayProps> = ({
  engine,
  onClose,
  onOpenSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamTime, setStreamTime] = useState('00:00:00');
  const startTimeRef = useRef(Date.now());

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
        const val = dataArray[i] || 18;
        const barHeight = Math.max(4, (val / 255) * canvas.height * 0.92);
        const x = i * barWidth;
        const y = canvas.height - barHeight;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, y);
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(0.5, '#f59e0b');
        gradient.addColorStop(1, '#f8fafc');

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
  const ov = engine.overlayConfig;
  const tk = engine.tiktokConfig;

  const bgClass =
    ov.chromaKey === 'green'
      ? 'bg-[#00FF00]'
      : ov.chromaKey === 'blue'
      ? 'bg-[#0000FF]'
      : ov.chromaKey === 'transparent'
      ? 'bg-slate-950/90'
      : 'bg-black';

  const filterCss =
    ov.videoFilter === 'westcoast_warm'
      ? 'sepia(0.18) saturate(1.35) contrast(1.08)'
      : ov.videoFilter === 'noir_chrome'
      ? 'grayscale(0.75) contrast(1.25)'
      : ov.videoFilter === '90s_vhs'
      ? 'contrast(1.15) saturate(1.25) hue-rotate(-8deg)'
      : ov.videoFilter === 'cyber_candy'
      ? 'saturate(1.5) contrast(1.15)'
      : 'none';

  const followerPercent = Math.min(
    100,
    Math.round((tk.followerCount / Math.max(1, tk.followerGoal)) * 100)
  );
  const donationPercent = Math.min(
    100,
    Math.round((tk.donationCurrentUsd / Math.max(1, tk.donationTargetUsd)) * 100)
  );
  const subPercent = Math.min(
    100,
    Math.round((tk.subscriberCount / Math.max(1, tk.subscriberGoal)) * 100)
  );

  return (
    <div
      className={`fixed inset-0 z-50 ${bgClass} flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none`}
      style={{ filter: filterCss }}
    >
      {/* .JPG Picture Backdrop (plus Optional Animated Video Backdrop) when Chroma Key is 'none' */}
      {ov.chromaKey === 'none' && (
        <>
          {/* Ambient blurred full-screen fill from the .JPG */}
          <img
            src={STUDIO_ICON_URL}
            alt="White Chocolate Studio Backdrop Fill"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 pointer-events-none"
          />
          {/* Crisp primary .JPG overlay backdrop zoomed in 50% from 50% (0.75x scale default, adjustable live) */}
          <img
            src={STUDIO_ICON_URL}
            alt="White Chocolate Studio Backdrop"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-contain opacity-80 pointer-events-none transition-transform duration-150"
            style={{ transform: `scale(${(ov.backdropZoom || 75) / 100})` }}
          />
          {engine.customVideoUrl && (
            <video
              src={engine.customVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/70 pointer-events-none" />
        </>
      )}

      {/* Corner 100-Spoke Chrome Spinners */}
      {ov.show100SpokeSpinners && (
        <>
          <div className="hidden sm:block absolute -bottom-16 -left-16 opacity-30 pointer-events-none">
            <ChromeWheelSvg
              size={220}
              rotationDeg={activeDeckState.rotationAngle}
              goldNipples={true}
            />
          </div>
          <div className="hidden sm:block absolute -bottom-16 -right-16 opacity-30 pointer-events-none">
            <ChromeWheelSvg
              size={220}
              rotationDeg={-activeDeckState.rotationAngle}
              goldNipples={true}
            />
          </div>
        </>
      )}

      {/* Top Stream Header + TikTok Stats + Goals */}
      <div className="flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2.5 bg-slate-950/90 px-3 py-2 rounded-xl border border-amber-500/40">
          <img
            src={STUDIO_ICON_URL}
            alt="White Chocolate DJ"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover border border-amber-400"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{tk.handle}</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[9px] font-black text-white">
                LIVE
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-300 flex items-center gap-2 tabular-nums">
              <span>{streamTime}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-amber-300">
                <Users className="w-3 h-3" /> {tk.viewerCount}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5 text-rose-400">
                <Heart className="w-3 h-3 fill-current" /> {(tk.likeCount / 1000).toFixed(1)}K
              </span>
            </div>
          </div>
        </div>

        {/* Stream Goal Bars: Follower Goal, Donation Goal & Subscriber Goal */}
        <div className="flex flex-wrap items-center gap-2">
          {ov.showFollowerGoal && (
            <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-700/80 min-w-[165px]">
              <div className="flex justify-between text-[9px] font-mono font-bold text-slate-200 mb-1 tabular-nums">
                <span>FOLLOWERS</span>
                <span className="text-amber-400">
                  {tk.followerCount} / {tk.followerGoal}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400"
                  style={{ width: `${followerPercent}%` }}
                />
              </div>
            </div>
          )}

          {ov.showDonationGoal && (
            <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-emerald-500/40 min-w-[175px]">
              <div className="flex justify-between text-[9px] font-mono font-bold text-slate-200 mb-1 tabular-nums">
                <span className="truncate max-w-[100px]">{tk.donationGoalTitle}</span>
                <span className="text-emerald-400">
                  ${tk.donationCurrentUsd} / ${tk.donationTargetUsd}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400"
                  style={{ width: `${donationPercent}%` }}
                />
              </div>
            </div>
          )}

          {ov.showSubGoal && (
            <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500/40 min-w-[165px]">
              <div className="flex justify-between text-[9px] font-mono font-bold text-slate-200 mb-1 tabular-nums">
                <span>VIP SUB GOAL</span>
                <span className="text-amber-300">
                  👑 {tk.subscriberCount} / {tk.subscriberGoal}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500"
                  style={{ width: `${subPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {ov.chromaKey === 'none' && (
            <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-700 text-[10px] font-mono text-slate-300">
              <span className="text-amber-400 font-bold mr-1">JPG ZOOM:</span>
              {[50, 75, 100, 125, 150].map((z) => (
                <button
                  key={z}
                  onClick={() => {
                    engine.overlayConfig.backdropZoom = z;
                    engine.notifyUpdate();
                  }}
                  className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                    ov.backdropZoom === z
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {z}%
                </button>
              ))}
            </div>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Customize</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Exit Overlay</span>
          </button>
        </div>
      </div>

      {/* Live TikTok Gift / Donation / Subscription Popup Alert Banner */}
      {tk.activeGiftAlert && (
        <div className="mx-auto z-20 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 text-slate-950 font-black shadow-2xl border-2 border-white flex items-center gap-3">
          <span className="text-3xl">{tk.activeGiftAlert.icon}</span>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-white font-mono">
              {tk.activeGiftAlert.alertType === 'donation'
                ? '💸 NEW STREAM DONATION & SONG REQUEST!'
                : tk.activeGiftAlert.alertType === 'subscription'
                ? '👑 NEW 100-SPOKE VIP SUBSCRIBER!'
                : '🎁 NEW TIKTOK GIFT ALERT!'}
            </div>
            <div className="text-sm sm:text-base font-black text-slate-950">
              {tk.activeGiftAlert.sender} — {tk.activeGiftAlert.giftName}!
            </div>
            {tk.activeGiftAlert.subText && (
              <div className="text-xs font-mono font-bold text-white bg-slate-950/75 px-2 py-0.5 rounded mt-0.5">
                {tk.activeGiftAlert.subText}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Centerpiece: Spinning 100-Spoke Chrome Wheel with Bullet Cap or Vinyl */}
      <div className="relative flex flex-col items-center justify-center my-auto z-10">
        <div className="relative p-2 rounded-full bg-gradient-to-b from-slate-200 via-slate-600 to-slate-950 shadow-2xl border-2 border-slate-400">
          {ov.wheelStyle !== 'classic_vinyl' ? (
            <ChromeWheelSvg
              size={280}
              rotationDeg={activeDeckState.rotationAngle}
              accentColor={ov.wheelStyle === 'gold_100_spoke' ? '#f59e0b' : '#ef4444'}
              goldNipples={true}
              showWhitewall={true}
              coverImageUrl={activeTrack?.coverImage || engine.customCoverUrl}
            />
          ) : (
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full vinyl-texture border-4 border-slate-400 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 rounded-full vinyl-sheen opacity-50" />
              <div
                className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-amber-400 shadow-2xl"
                style={{
                  transform: `rotate(${activeDeckState.rotationAngle}deg)`,
                }}
              >
                <img
                  src={activeTrack?.coverImage || engine.customCoverUrl}
                  alt="White Chocolate Studio"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-800 border-2 border-white shadow-md" />
            </div>
          )}
        </div>

        {/* Brand Wordmark Title */}
        <div className="mt-3 -translate-y-[8mm] relative z-10 text-center bg-slate-950/85 px-5 py-2 rounded-2xl border border-amber-500/40">
          <h1 className="text-lg sm:text-2xl font-black tracking-wider bg-gradient-to-r from-slate-100 via-amber-300 to-slate-100 bg-clip-text text-transparent uppercase font-display">
            White Chocolate Studio
          </h1>
          <p className="text-[11px] text-amber-400 font-mono tracking-widest">
            100-SPOKE LOWRIDER LIVE MIX · {activeDeckState.effectiveBpm.toFixed(1)} BPM
          </p>
        </div>
      </div>

      {/* Bottom HUD: Chat Ticker, Spectrum Visualizer, Now Playing & Quick Voice/Drop Triggers */}
      <div className="space-y-2.5 z-10 w-full max-w-2xl mx-auto">
        {/* Live TikTok Chat & Gift Feed */}
        {ov.showChatTicker && (
          <div className="bg-slate-950/85 rounded-xl border border-slate-800 p-2.5 max-h-24 overflow-y-auto space-y-1">
            {tk.recentChat.slice(0, 3).map((msg) => (
              <div key={msg.id} className="text-xs flex items-center gap-1.5 truncate">
                {msg.badge && (
                  <span className="text-[9px] font-mono font-bold text-amber-400 uppercase">
                    [{msg.badge}]
                  </span>
                )}
                <span className="font-bold text-rose-400">{msg.user}:</span>
                <span className="text-slate-200 truncate">{msg.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Audio Reactive Spectrum Canvas */}
        <div className="w-full h-14 sm:h-16 bg-slate-950/85 rounded-xl border border-slate-800 p-1 overflow-hidden">
          <canvas ref={canvasRef} width={520} height={64} className="w-full h-full block" />
        </div>

        {/* Now Playing Banner */}
        {ov.showNowPlaying && (
          <div className="p-2.5 bg-slate-950/95 rounded-xl border border-amber-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeTrack?.coverImage || engine.customCoverUrl}
                alt="Track Cover"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-lg object-cover border border-amber-400/60 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-black text-white truncate">
                  {activeTrack?.title || 'White Chocolate Studio Mix'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {activeTrack?.genre || 'West Coast Lowrider Mix'} · {activeTrack?.key || 'Live'}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-sm font-black font-mono text-amber-400 tabular-nums">
                {activeDeckState.effectiveBpm.toFixed(1)} BPM
              </span>
              <div className="text-[9px] text-slate-400 font-mono">
                DECK {activeDeckId} · {engine.obsConfig.activeScene}
              </div>
            </div>
          </div>
        )}

        {/* Quick Streamer Soundbites & Voice Clip Triggers */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {engine.voiceClipSlots.slice(0, 3).map((slot, idx) => (
            <button
              key={slot.id}
              onClick={() => engine.playVoiceSlot(idx)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Mic className="w-3 h-3" />
              <span>{slot.label}</span>
            </button>
          ))}
          {(['lowrider_horn', 'hydraulic_pop', 'sub_boom', 'money_cash'] as const).map((id) => (
            <button
              key={id}
              onClick={() => engine.triggerSoundboard(id)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 active:scale-95 transition-transform"
            >
              {id === 'lowrider_horn'
                ? '🚘 KLAXON'
                : id === 'hydraulic_pop'
                ? '🛞 HYDRAULIC'
                : id === 'sub_boom'
                ? '💥 808'
                : '🤑 $$ GIFT'}
            </button>
          ))}
        </div>

        {/* Custom Marquee Banner */}
        <div className="bg-slate-950/95 border border-slate-800 rounded-lg px-3 py-1 text-center text-[10px] font-mono text-amber-300 tracking-wider truncate">
          {ov.marqueeText}
        </div>
      </div>
    </div>
  );
};
