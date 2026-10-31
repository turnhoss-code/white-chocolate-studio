/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Live Stream Broadcast & Mic Talkover Center
 */

import React, { useState, useEffect } from 'react';
import { DJEngine, MicVoiceEffect } from '../audio/DJEngine';
import { Mic, MicOff, Radio, Download, Video, HelpCircle, CheckCircle, Volume2, Shield } from 'lucide-react';

interface StreamBroadcastModalProps {
  engine: DJEngine;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverlay: () => void;
}

export const StreamBroadcastModal: React.FC<StreamBroadcastModalProps> = ({
  engine,
  isOpen,
  onClose,
  onOpenOverlay
}) => {
  const [activeTab, setActiveTab] = useState<'mic' | 'setup' | 'record'>('mic');
  const [recTimer, setRecTimer] = useState('00:00');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>TIKTOK STREAM & BROADCAST CENTER</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono">
                  LIVE READY
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Microphone talkover, live stream audio routing, and set recorder
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
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 gap-2">
          <button
            onClick={() => setActiveTab('mic')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'mic'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            DJ MIC & TALKOVER
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'setup'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            TIKTOK / OBS SETUP
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'record'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            SET RECORDER
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'mic' && (
            <div className="space-y-4">
              {/* Mic Main Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => engine.toggleMicrophone()}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                      engine.micActive
                        ? 'bg-rose-500 text-white shadow-rose-500/40 animate-pulse'
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
                        ? 'Your voice is mixed directly into the stream bus'
                        : 'Click or tap to enable DJ talkover microphone'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-mono px-2 py-1 rounded font-bold ${
                      engine.micActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {engine.micActive ? 'TRANSMITTING' : 'OFF AIR'}
                  </span>
                </div>
              </div>

              {/* Talkover Auto-Ducking */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">AUTO-DUCKING TALKOVER</div>
                  <div className="text-[11px] text-slate-400">
                    Automatically lowers music by -14dB so TikTok chat hears your voice clearly
                  </div>
                </div>
                <button
                  onClick={() => {
                    engine.micTalkoverDucking = !engine.micTalkoverDucking;
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    engine.micTalkoverDucking
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {engine.micTalkoverDucking ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Voice Effects */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">STREAMER VOICE EFFECTS</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['clean', 'radio', 'robot'] as MicVoiceEffect[]).map((fx) => (
                    <button
                      key={fx}
                      onClick={() => engine.setMicEffect(fx)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs capitalize transition-all ${
                        engine.micEffect === fx
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {fx} Voice
                    </button>
                  ))}
                </div>
              </div>

              {/* Mic Volume */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>MIC GAIN</span>
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

          {activeTab === 'setup' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                  <Video className="w-4 h-4" />
                  <span>How to Stream on TikTok LIVE (Mobile or PC)</span>
                </div>
                <div className="space-y-2 text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-rose-400">1.</span>
                    <span>
                      <strong>Mobile (iPhone / Android):</strong> Open TikTok app &gt; tap <strong>+</strong> &gt; swipe to <strong>LIVE</strong> &gt; choose <strong>Mobile Gaming / Screen Broadcast</strong>. Launch White Chocolate Studio in your mobile browser. All mixed audio streams directly to your TikTok audience in high fidelity!
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-rose-400">2.</span>
                    <span>
                      <strong>TikTok LIVE Studio / OBS on PC:</strong> Add an <strong>Audio Output Capture</strong> (Default speakers) or <strong>Application Audio Capture (BETA)</strong> pointing to your browser. No extra soundcards needed!
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-rose-400">3.</span>
                    <span>
                      <strong>TikTok Overlay Mode:</strong> Click the button below to open the dedicated full-screen TikTok Visualizer Overlay (with live spinning White Chocolate vinyl, animated EQ spectrum, and Now Playing card).
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenOverlay();
                }}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <Video className="w-4 h-4" />
                <span>LAUNCH FULLSCREEN TIKTOK OVERLAY</span>
              </button>
            </div>
          )}

          {activeTab === 'record' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
                <div className="text-xs font-mono text-slate-400">RECORD LIVE SET / MIX</div>
                <div className="text-4xl font-mono font-black text-white tabular-nums">
                  {recTimer}
                </div>
                <div className="text-xs text-slate-400">
                  {engine.isRecording
                    ? 'Recording live master audio + microphone + soundboard drops'
                    : 'Ready to capture high-resolution audio file for TikTok / Reels upload'}
                </div>

                <button
                  onClick={() => engine.toggleRecording()}
                  className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
                    engine.isRecording
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                  }`}
                >
                  {engine.isRecording ? (
                    <>
                      <div className="w-3 h-3 bg-white rounded-sm" />
                      <span>STOP RECORDING & DOWNLOAD MIX</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                      <span>START RECORDING MIX</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-bold text-slate-300">Format & Quality:</div>
                <div>• Format: Lossless Opus 48kHz WebM Audio (Ready for editing or posting)</div>
                <div>• Direct hardware mix bus with zero background fan/mic noise bleed</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
