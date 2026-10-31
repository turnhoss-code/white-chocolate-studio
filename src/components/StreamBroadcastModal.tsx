/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - TikTok Integrations, OBS Studio Bridge, Overlay Customizer & Set Recorder
 */

import React, { useState, useEffect } from 'react';
import { DJEngine, MicVoiceEffect } from '../audio/DJEngine';
import { STUDIO_ICON_URL } from '../audio/proceduralTracks';
import {
  Mic,
  MicOff,
  Radio,
  Video,
  Sliders,
  Tv,
  Sparkles,
  Check,
  Copy,
  Gift,
  Shield,
  Disc,
} from 'lucide-react';

interface StreamBroadcastModalProps {
  engine: DJEngine;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverlay: () => void;
  initialTab?: 'tiktok' | 'obs' | 'overlay' | 'mic' | 'record';
}

export const StreamBroadcastModal: React.FC<StreamBroadcastModalProps> = ({
  engine,
  isOpen,
  onClose,
  onOpenOverlay,
  initialTab = 'tiktok',
}) => {
  const [activeTab, setActiveTab] = useState<'tiktok' | 'obs' | 'overlay' | 'mic' | 'record'>(
    initialTab
  );
  const [recTimer, setRecTimer] = useState('00:00');
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let interval: number;
    if (engine.isRecording) {
      interval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - engine.recordingStartTime) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        setRecTimer(`${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
      }, 500);
    } else {
      setRecTimer('00:00');
    }
    return () => clearInterval(interval);
  }, [engine.isRecording, engine.recordingStartTime]);

  if (!isOpen) return null;

  const browserSourceUrl = `${window.location.origin}/?overlay=1&wheel=${engine.overlayConfig.wheelStyle}&chroma=${engine.overlayConfig.chromaKey}`;

  const handleCopyBrowserSource = () => {
    navigator.clipboard?.writeText(browserSourceUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Chrome Pinstripe */}
        <div
          className="h-1 w-full"
          style={{
            background:
              'linear-gradient(90deg, #cbd5e1 0%, #ef4444 25%, #f59e0b 50%, #3b82f6 75%, #cbd5e1 100%)',
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <img
              src={STUDIO_ICON_URL}
              alt="White Chocolate Studio"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-amber-400/60"
            />
            <div>
              <h2 className="text-sm font-black text-white tracking-wide uppercase">
                TikTok LIVE, OBS Studio &amp; Overlay Control Center
              </h2>
              <p className="text-xs text-slate-400">
                100-Spoke Lowrider Stream Customizer · Zero API Keys Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 gap-1 overflow-x-auto">
          {(
            [
              { id: 'tiktok', label: 'TikTok LIVE' },
              { id: 'obs', label: 'OBS Studio' },
              { id: 'overlay', label: 'Overlay Customizer' },
              { id: 'mic', label: 'Mic & Voice FX' },
              { id: 'record', label: 'Mix Recorder' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === t.id
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* =============================================================== */}
          {/* TAB 1: TIKTOK LIVE INTEGRATIONS                                 */}
          {/* =============================================================== */}
          {activeTab === 'tiktok' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    TikTok Creator Handle
                  </label>
                  <input
                    type="text"
                    value={engine.tiktokConfig.handle}
                    onChange={(e) => {
                      engine.tiktokConfig.handle = e.target.value;
                      engine.notifyUpdate();
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Follower Goal Target
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={engine.tiktokConfig.followerCount}
                      onChange={(e) => {
                        engine.tiktokConfig.followerCount = Number(e.target.value) || 0;
                        engine.notifyUpdate();
                      }}
                      className="w-1/2 h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs"
                      title="Current Followers"
                    />
                    <span className="text-slate-500">/</span>
                    <input
                      type="number"
                      value={engine.tiktokConfig.followerGoal}
                      onChange={(e) => {
                        engine.tiktokConfig.followerGoal = Number(e.target.value) || 1000;
                        engine.notifyUpdate();
                      }}
                      className="w-1/2 h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono text-xs"
                      title="Goal Followers"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  TikTok Stream Title &amp; Pinned Topic
                </label>
                <input
                  type="text"
                  value={engine.tiktokConfig.streamTitle}
                  onChange={(e) => {
                    engine.tiktokConfig.streamTitle = e.target.value;
                    engine.notifyUpdate();
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Essential Smooth TikTok Streaming Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>DMCA Pitch Guard</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Applies +2.5% micro-pitch shift to help prevent live stream audio mute flags
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      engine.tiktokConfig.dmcaPitchGuard = !engine.tiktokConfig.dmcaPitchGuard;
                      engine.setTempo('A', engine.deckAState.tempo);
                      engine.setTempo('B', engine.deckBState.tempo);
                      engine.notifyUpdate();
                    }}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      engine.tiktokConfig.dmcaPitchGuard
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {engine.tiktokConfig.dmcaPitchGuard ? 'ENABLED (+2.5%)' : 'OFF'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-rose-400" />
                      <span>Gift Alert Auto-Duck</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automatically ducks music volume when a TikTok Gift alert &amp; soundbite plays
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      engine.tiktokConfig.autoDuckOnGift = !engine.tiktokConfig.autoDuckOnGift;
                      engine.notifyUpdate();
                    }}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      engine.tiktokConfig.autoDuckOnGift
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {engine.tiktokConfig.autoDuckOnGift ? 'ENABLED' : 'OFF'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2">
                  <div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>Stream Aspect Ratio</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Optimize layout for vertical 9:16 Mobile Gaming or 16:9 TikTok LIVE Studio
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(['9:16', '16:9'] as const).map((asp) => (
                      <button
                        key={asp}
                        onClick={() => {
                          engine.tiktokConfig.aspectMode = asp;
                          engine.notifyUpdate();
                        }}
                        className={`py-1.5 rounded-lg font-mono font-bold text-xs ${
                          engine.tiktokConfig.aspectMode === asp
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {asp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Test Live TikTok Gift Alerts */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>TRIGGER LIVE TIKTOK GIFT ALERT + SOUNDBITE</span>
                  <span className="text-[10px] font-mono text-amber-400">INSTANT OVERLAY POPUP</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'rose', label: '🌹 Rose (25)' },
                      { id: 'money_gun', label: '💵 Cash Gun' },
                      { id: 'lowrider_hop', label: '🛞 100-Spoke Hop' },
                      { id: 'galaxy', label: '🌌 Galaxy' },
                      { id: 'lion', label: '🦁 Golden Lion' },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.id}
                      onClick={() => engine.triggerTikTokGiftAlert(g.id)}
                      className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-bold text-slate-100 transition-transform active:scale-95 text-center"
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: OBS STUDIO & TIKTOK LIVE STUDIO INTEGRATIONS             */}
          {/* =============================================================== */}
          {activeTab === 'obs' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white">OBS Studio WebSocket v5 Bridge</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      engine.obsConfig.connected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {engine.obsConfig.connected ? 'BRIDGE LINKED' : 'LOCAL / BROWSER SOURCE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={engine.obsConfig.websocketUrl}
                    onChange={(e) => {
                      engine.obsConfig.websocketUrl = e.target.value;
                      engine.notifyUpdate();
                    }}
                    placeholder="ws://localhost:4455"
                    className="sm:col-span-2 h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs"
                  />
                  <button
                    onClick={() => {
                      engine.obsConfig.connected = !engine.obsConfig.connected;
                      engine.notifyUpdate();
                    }}
                    className={`h-10 rounded-xl font-bold text-xs transition-colors ${
                      engine.obsConfig.connected
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    {engine.obsConfig.connected ? 'Disconnect OBS' : 'Link OBS Scene Bridge'}
                  </button>
                </div>
              </div>

              {/* OBS Scene Switcher & Crossfader Auto-Scene Sync */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">OBS SCENE SWITCHER</span>
                  <button
                    onClick={() => {
                      engine.obsConfig.syncCrossfaderToScene = !engine.obsConfig.syncCrossfaderToScene;
                      engine.notifyUpdate();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      engine.obsConfig.syncCrossfaderToScene
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Crossfader Scene Sync: {engine.obsConfig.syncCrossfaderToScene ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'Lowrider Booth 9:16',
                      '100-Spoke Rim Cam',
                      'Dual Turntable Close-Up',
                      'BRB Hydraulic Screen',
                    ] as const
                  ).map((sceneName) => (
                    <button
                      key={sceneName}
                      onClick={() => {
                        engine.obsConfig.activeScene = sceneName;
                        engine.notifyUpdate();
                      }}
                      className={`p-2.5 rounded-xl border text-left font-bold transition-colors ${
                        engine.obsConfig.activeScene === sceneName
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {sceneName}
                    </button>
                  ))}
                </div>
              </div>

              {/* OBS Browser Source Overlay URL */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200">
                  OBS Studio / TikTok LIVE Studio Browser Source URL
                </div>
                <p className="text-[11px] text-slate-400">
                  Paste this URL into an OBS <strong>Browser Source</strong> (1080x1920 for vertical or 1920x1080 for horizontal) and check &quot;Control audio via OBS&quot;.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={browserSourceUrl}
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono text-[11px]"
                  />
                  <button
                    onClick={handleCopyBrowserSource}
                    className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 shrink-0"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: STREAM OVERLAY CUSTOMIZER                                */}
          {/* =============================================================== */}
          {activeTab === 'overlay' && (
            <div className="space-y-4">
              {/* Wheel Centerpiece Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <label className="block font-bold text-slate-200">
                    Overlay Centerpiece Platter
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {(
                      [
                        { id: 'chrome_100_spoke', label: '100-Spoke Chrome Wheel + Bullet Cap' },
                        { id: 'gold_100_spoke', label: '24K Gold 100-Spoke Lowrider Rim' },
                        { id: 'classic_vinyl', label: 'Classic White Chocolate Vinyl Record' },
                      ] as const
                    ).map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          engine.overlayConfig.wheelStyle = w.id;
                          engine.notifyUpdate();
                        }}
                        className={`p-2 rounded-lg border text-left font-bold transition-colors ${
                          engine.overlayConfig.wheelStyle === w.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chroma Key & Video Filter */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      Overlay Backdrop &amp; OBS Chroma Key
                    </label>
                    <div className="mb-2 p-2 rounded-lg bg-slate-900/90 border border-amber-500/30 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={STUDIO_ICON_URL}
                          alt="Overlay .JPG Backdrop"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover border border-amber-400 shrink-0"
                        />
                        <div className="text-[11px] text-slate-300 leading-tight flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300">Active .JPG Overlay Backdrop</span>
                            <span className="font-mono text-amber-400 font-bold">
                              {engine.overlayConfig.backdropZoom}%
                            </span>
                          </div>
                          <div className="text-slate-400">
                            Uses official White Chocolate Studio .JPG artwork behind the 100-spoke overlay
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">ZOOM</span>
                        <input
                          type="range"
                          min={25}
                          max={200}
                          step={5}
                          value={engine.overlayConfig.backdropZoom}
                          onChange={(e) => {
                            engine.overlayConfig.backdropZoom = Number(e.target.value);
                            engine.notifyUpdate();
                          }}
                          className="dj-slider flex-1 h-4"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'none', label: '.JPG Studio Backdrop' },
                          { id: 'green', label: 'Green Screen (#00FF00)' },
                          { id: 'blue', label: 'Blue Screen (#0000FF)' },
                          { id: 'transparent', label: 'Clean Minimal HUD' },
                        ] as const
                      ).map((ck) => (
                        <button
                          key={ck.id}
                          onClick={() => {
                            engine.overlayConfig.chromaKey = ck.id;
                            engine.notifyUpdate();
                          }}
                          className={`p-1.5 rounded-lg border text-[11px] font-bold ${
                            engine.overlayConfig.chromaKey === ck.id
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800'
                          }`}
                        >
                          {ck.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      Stream Visual Filter Grade
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'none', label: 'Clean' },
                          { id: 'westcoast_warm', label: 'LA Golden' },
                          { id: 'noir_chrome', label: 'Silver Noir' },
                          { id: '90s_vhs', label: '90s Tape' },
                          { id: 'cyber_candy', label: 'Candy Red' },
                        ] as const
                      ).map((vf) => (
                        <button
                          key={vf.id}
                          onClick={() => {
                            engine.overlayConfig.videoFilter = vf.id;
                            engine.notifyUpdate();
                          }}
                          className={`py-1 px-1.5 rounded text-[10px] font-bold border ${
                            engine.overlayConfig.videoFilter === vf.id
                              ? 'bg-rose-600 text-white border-rose-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {vf.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Marquee Banner & Widget Toggles */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-200 mb-1">
                    Scrolling Stream Banner Text
                  </label>
                  <input
                    type="text"
                    value={engine.overlayConfig.marqueeText}
                    onChange={(e) => {
                      engine.overlayConfig.marqueeText = e.target.value;
                      engine.notifyUpdate();
                    }}
                    className="w-full h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      engine.overlayConfig.showNowPlaying = !engine.overlayConfig.showNowPlaying;
                      engine.notifyUpdate();
                    }}
                    className={`py-2 rounded-lg font-bold border ${
                      engine.overlayConfig.showNowPlaying
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Now Playing Card
                  </button>
                  <button
                    onClick={() => {
                      engine.overlayConfig.showChatTicker = !engine.overlayConfig.showChatTicker;
                      engine.notifyUpdate();
                    }}
                    className={`py-2 rounded-lg font-bold border ${
                      engine.overlayConfig.showChatTicker
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Live Chat Feed
                  </button>
                  <button
                    onClick={() => {
                      engine.overlayConfig.showFollowerGoal = !engine.overlayConfig.showFollowerGoal;
                      engine.notifyUpdate();
                    }}
                    className={`py-2 rounded-lg font-bold border ${
                      engine.overlayConfig.showFollowerGoal
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Follower Goal Bar
                  </button>
                  <button
                    onClick={() => {
                      engine.overlayConfig.showDonationGoal = !engine.overlayConfig.showDonationGoal;
                      engine.notifyUpdate();
                    }}
                    className={`py-2 rounded-lg font-bold border ${
                      engine.overlayConfig.showDonationGoal
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Donation Goal Bar
                  </button>
                  <button
                    onClick={() => {
                      engine.overlayConfig.showSubGoal = !engine.overlayConfig.showSubGoal;
                      engine.notifyUpdate();
                    }}
                    className={`py-2 rounded-lg font-bold border ${
                      engine.overlayConfig.showSubGoal
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    VIP Sub Goal Bar
                  </button>
                  <button
                    onClick={() => {
                      engine.overlayConfig.show100SpokeSpinners =
                        !engine.overlayConfig.show100SpokeSpinners;
                      engine.notifyUpdate();
                    }}
                    className={`py-2 rounded-lg font-bold border ${
                      engine.overlayConfig.show100SpokeSpinners
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    Corner 100-Spokes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: DJ MICROPHONE & VOICE FX                                 */}
          {/* =============================================================== */}
          {activeTab === 'mic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => engine.toggleMicrophone()}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                      engine.micActive
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {engine.micActive ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
                  </button>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {engine.micActive ? 'MICROPHONE LIVE ON STREAM' : 'MICROPHONE MUTED'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {engine.micActive
                        ? 'Your voice is routed through the Voice FX chain into the stream bus'
                        : 'Click to enable live DJ talkover microphone'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    engine.micTalkoverDucking = !engine.micTalkoverDucking;
                    engine.notifyUpdate();
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    engine.micTalkoverDucking
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Auto-Duck: {engine.micTalkoverDucking ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  STUDIO VOICE FX PROCESSOR
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
                  {(
                    ['clean', 'chopped', 'talkbox', 'radio', 'robot', 'reverb', 'echo'] as MicVoiceEffect[]
                  ).map((fx) => (
                    <button
                      key={fx}
                      onClick={() => engine.setMicEffect(fx)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs capitalize transition-colors ${
                        engine.micEffect === fx
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {fx}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>MIC &amp; VOICE CLIP GAIN</span>
                  <span>{Math.round(engine.micVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={engine.micVolume}
                  onChange={(e) => engine.setMicVolume(parseFloat(e.target.value))}
                  className="dj-slider w-full h-4"
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 5: MASTER SET RECORDER                                      */}
          {/* =============================================================== */}
          {activeTab === 'record' && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
                <div className="text-xs font-mono text-amber-400">
                  MASTER DJ SET &amp; VOICE SAMPLER RECORDER
                </div>
                <div className="text-4xl font-mono font-black text-white tabular-nums">
                  {recTimer}
                </div>
                <div className="text-xs text-slate-400">
                  {engine.isRecording
                    ? 'Recording Decks A & B + Voice Clips + Soundbites + Live Mic'
                    : 'Capture lossless audio of your mix for TikTok / Reels / YouTube Shorts'}
                </div>

                <button
                  onClick={() => engine.toggleRecording()}
                  className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
                    engine.isRecording
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <Disc className="w-4 h-4" />
                  <span>
                    {engine.isRecording
                      ? 'STOP RECORDING & DOWNLOAD MIX FILE'
                      : 'START RECORDING LIVE MIX'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Launch Overlay CTA */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 font-mono truncate">
            OBS Scene: <span className="text-amber-300">{engine.obsConfig.activeScene}</span> · Wheel:{' '}
            <span className="text-white">{engine.overlayConfig.wheelStyle}</span>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenOverlay();
            }}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 shrink-0"
          >
            <Video className="w-4 h-4" />
            <span>Launch Fullscreen Stream Overlay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
