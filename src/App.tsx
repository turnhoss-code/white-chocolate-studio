/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - 100-Spoke Lowrider DJ & TikTok Streamer Console
 */

import React, { useEffect, useState, useMemo } from 'react';
import { DJEngine } from './audio/DJEngine';
import { generateProceduralTrack, TrackMetadata, STUDIO_ICON_URL } from './audio/proceduralTracks';
import { DeckView } from './components/DeckView';
import { MixerSection } from './components/MixerSection';
import { Soundboard } from './components/Soundboard';
import { FXRack } from './components/FXRack';
import { ThreeDJStage } from './components/ThreeDJStage';
import { CreativeStudio } from './components/CreativeStudio';
import { StreamBroadcastModal } from './components/StreamBroadcastModal';
import { StreamOverlay } from './components/StreamOverlay';
import { ChromeWheelSvg } from './components/ChromeWheelSvg';
import { DonationsSubscriptionPanel } from './components/DonationsSubscriptionPanel';
import { Radio, Box, Sparkles, Sliders, Disc, Tv, DollarSign } from 'lucide-react';

type ActiveWorkspaceTab =
  | 'decks'
  | 'donations_subs'
  | 'stage3d'
  | 'ai_studio'
  | 'soundboard'
  | 'fx';
type MobileDeckFilter = 'both' | 'deckA' | 'mixer' | 'deckB';

export default function App() {
  const engine = useMemo(() => new DJEngine(), []);
  const [, setTick] = useState(0);
  const [tracks, setTracks] = useState<TrackMetadata[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  const [workspaceTab, setWorkspaceTab] = useState<ActiveWorkspaceTab>('decks');
  const [mobileDeckFilter, setMobileDeckFilter] = useState<MobileDeckFilter>('both');
  const [is3DFullscreen, setIs3DFullscreen] = useState(false);

  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [streamModalTab, setStreamModalTab] = useState<
    'tiktok' | 'obs' | 'overlay' | 'mic' | 'record'
  >('tiktok');
  const [isOverlayOpen, setIsOverlayOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('overlay') === '1';
    }
    return false;
  });

  // Initial Load: generate Lowrider and Studio stems locally (zero API keys needed)
  useEffect(() => {
    let isMounted = true;
    async function loadTracks() {
      try {
        const t1 = await generateProceduralTrack('track_lowrider');
        const t2 = await generateProceduralTrack('track_slowjam');
        const t3 = await generateProceduralTrack('track_chopped');
        const t4 = await generateProceduralTrack('track_trap');
        const t5 = await generateProceduralTrack('track_funk');
        const t6 = await generateProceduralTrack('track_afro');
        const t7 = await generateProceduralTrack('track_club');

        if (isMounted) {
          const loadedTracks = [
            t1.metadata,
            t2.metadata,
            t3.metadata,
            t4.metadata,
            t5.metadata,
            t6.metadata,
            t7.metadata,
          ];
          setTracks(loadedTracks);
          setIsLoadingTracks(false);

          // Auto-load Deck A (West Coast Lowrider Bounce) and Deck B (90s Midnight Slow Jam)
          engine.loadTrack('A', t1.metadata);
          engine.loadTrack('B', t2.metadata);
        }
      } catch (err) {
        console.error('Failed to generate procedural audio tracks:', err);
        setIsLoadingTracks(false);
      }
    }

    loadTracks();

    engine.registerStateListener(() => {
      setTick((t) => t + 1);
    });

    return () => {
      isMounted = false;
      engine.destroy();
    };
  }, [engine]);

  // Global Keyboard Shortcuts for Pro DJing & Voice Clips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        engine.playPauseDeck('A');
      } else if (e.code === 'Enter') {
        e.preventDefault();
        engine.playPauseDeck('B');
      } else if (e.key === 'q' || e.key === 'Q') {
        engine.triggerCue('A', true);
      } else if (e.key === 'p' || e.key === 'P') {
        engine.triggerCue('B', true);
      } else if (e.key === '1') {
        engine.triggerSoundboard('airhorn');
      } else if (e.key === '2') {
        engine.triggerSoundboard('lowrider_horn');
      } else if (e.key === '3') {
        engine.triggerSoundboard('hydraulic_pop');
      } else if (e.key === '4') {
        engine.triggerSoundboard('sub_boom');
      } else if (e.key === '5') {
        engine.triggerSoundboard('chimes_sweep');
      } else if (e.key === '6') {
        engine.playVoiceSlot(0);
      } else if (e.key === '7') {
        engine.playVoiceSlot(1);
      } else if (e.key === '8') {
        engine.playVoiceSlot(2);
      } else if (e.key === '9') {
        engine.playVoiceSlot(3);
      } else if (e.key === 'ArrowLeft') {
        engine.updateCrossfader(Math.max(-1, engine.crossfader - 0.15));
      } else if (e.key === 'ArrowRight') {
        engine.updateCrossfader(Math.min(1, engine.crossfader + 0.15));
      } else if (e.key === 'ArrowDown') {
        engine.updateCrossfader(0);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        return;
      }
      if (e.key === 'q' || e.key === 'Q') {
        engine.triggerCue('A', false);
      } else if (e.key === 'p' || e.key === 'P') {
        engine.triggerCue('B', false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine]);

  const handleAddTrackToLibrary = (newTrack: TrackMetadata) => {
    setTracks((prev) => [newTrack, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Bar Contract: Zone 1 (Single element wordmark) — Zone 2 (5 single-line nav links) — Zone 3 (1 primary CTA) */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setWorkspaceTab('decks');
          }}
          className="text-base sm:text-lg font-black tracking-wide text-white uppercase font-display whitespace-nowrap shrink-0"
        >
          White Chocolate Studio
        </a>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <button
            onClick={() => setWorkspaceTab('decks')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              workspaceTab === 'decks' ? 'text-white border-amber-400' : 'border-transparent'
            }`}
          >
            DJ Decks &amp; Library
          </button>
          <button
            onClick={() => setWorkspaceTab('donations_subs')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              workspaceTab === 'donations_subs'
                ? 'text-emerald-400 border-emerald-400'
                : 'border-transparent text-emerald-300'
            }`}
          >
            Donations &amp; VIP Subs
          </button>
          <button
            onClick={() => setWorkspaceTab('stage3d')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              workspaceTab === 'stage3d' ? 'text-white border-amber-400' : 'border-transparent'
            }`}
          >
            3D Lowrider Stage
          </button>
          <button
            onClick={() => setWorkspaceTab('ai_studio')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              workspaceTab === 'ai_studio' ? 'text-white border-amber-400' : 'border-transparent'
            }`}
          >
            Beat &amp; Artwork Lab
          </button>
          <button
            onClick={() => setIsOverlayOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 text-amber-400"
          >
            100-Spoke Overlay
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => {
              setStreamModalTab('tiktok');
              setIsStreamModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[40px] shadow-md"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Stream Hub</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* Lowrider 100-Spoke Chrome Brand Banner & Workspace Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/95 border border-amber-500/30 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background:
                'linear-gradient(90deg, #94a3b8 0%, #f59e0b 25%, #ffffff 50%, #ef4444 75%, #94a3b8 100%)',
            }}
          />

          <div className="flex items-center gap-3">
            {/* Official .JPG Icon + Spinning 100-Spoke Chrome Wheel Emblem */}
            <div className="relative flex items-center">
              <img
                src={STUDIO_ICON_URL}
                alt="White Chocolate Studio"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400 shrink-0 shadow-lg"
              />
              <div className="hidden sm:block -ml-3">
                <ChromeWheelSvg
                  size={44}
                  rotationDeg={
                    engine.deckAState.isPlaying
                      ? engine.deckAState.rotationAngle
                      : engine.deckBState.rotationAngle
                  }
                  goldNipples={true}
                  showWhitewall={true}
                />
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-white flex flex-wrap items-center gap-1.5">
                <span>White Chocolate 100-Spoke Lowrider Rig</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-xs font-normal text-amber-400 font-mono">
                  100-Spoke Chrome &amp; Bullet Caps · TikTok LIVE Ready
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Local Music Library Crate · TikTok Donations &amp; Song Requests · Super Fan VIP Subscriptions
              </div>
            </div>
          </div>

          {/* Interactive Workspace Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setWorkspaceTab('decks')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                workspaceTab === 'decks'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Decks &amp; Library</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('donations_subs')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                workspaceTab === 'donations_subs'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Donations &amp; Subs</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('stage3d')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                workspaceTab === 'stage3d'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Lowrider</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('ai_studio')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                workspaceTab === 'ai_studio'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Beat &amp; Visual Lab</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('soundboard')}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
                workspaceTab === 'soundboard'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Soundbites &amp; FX</span>
            </button>

            <button
              onClick={() => {
                setStreamModalTab('overlay');
                setIsStreamModalOpen(true);
              }}
              className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 text-amber-300 hover:text-white transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Overlay &amp; OBS</span>
            </button>
          </div>
        </div>

        {isLoadingTracks && (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-amber-400 font-mono">
            SYNTHESIZING WEST COAST LOWRIDER &amp; STUDIO STEMS...
          </div>
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 1: DUAL 100-SPOKE DJ DECKS, LIBRARY & MIXER        */}
        {/* ================================================================= */}
        {workspaceTab === 'decks' && (
          <>
            {/* Mobile Sub-Selector */}
            <div className="md:hidden flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'both', label: 'Decks A & B + Mixer' },
                  { id: 'deckA', label: 'Deck A' },
                  { id: 'deckB', label: 'Deck B' },
                  { id: 'mixer', label: 'Mixer & Library' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMobileDeckFilter(item.id)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors min-h-[40px] whitespace-nowrap ${
                    mobileDeckFilter === item.id
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Side-by-Side Deck A & Deck B + Main Mixer Console */}
            <div className="space-y-4">
              {/* Top Row: Deck A and Deck B Side-by-Side Next to Each Other */}
              {(mobileDeckFilter === 'both' ||
                mobileDeckFilter === 'deckA' ||
                mobileDeckFilter === 'deckB') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div
                    className={
                      mobileDeckFilter === 'deckB' ? 'hidden md:block' : 'block'
                    }
                  >
                    <DeckView
                      deckId="A"
                      engine={engine}
                      state={engine.deckAState}
                      availableTracks={tracks}
                      onTrackAdded={handleAddTrackToLibrary}
                    />
                  </div>

                  <div
                    className={
                      mobileDeckFilter === 'deckA' ? 'hidden md:block' : 'block'
                    }
                  >
                    <DeckView
                      deckId="B"
                      engine={engine}
                      state={engine.deckBState}
                      availableTracks={tracks}
                      onTrackAdded={handleAddTrackToLibrary}
                    />
                  </div>
                </div>
              )}

              {/* Bottom Row: Central Mixer, Crossfader, Local Music Library Crate & Voice Clip Recorder */}
              <div
                className={
                  mobileDeckFilter === 'both' || mobileDeckFilter === 'mixer'
                    ? 'block'
                    : 'hidden md:block'
                }
              >
                <MixerSection
                  engine={engine}
                  crossfader={engine.crossfader}
                  curve={engine.crossfaderCurve}
                  onCrossfaderChange={(val) => engine.updateCrossfader(val)}
                  onCurveChange={(curve) => engine.setCrossfaderCurve(curve)}
                  availableTracks={tracks}
                  onAddTrackToLibrary={handleAddTrackToLibrary}
                />
              </div>
            </div>

            {/* Secondary Row: Real-Time DSP FX Rack & 12-Pad Lowrider/R&B Soundboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Soundboard engine={engine} />
              <FXRack engine={engine} />
            </div>

            {/* Third Row: Integrated TikTok LIVE Donations, Song Request Queue & VIP Subscriptions */}
            <DonationsSubscriptionPanel
              engine={engine}
              availableTracks={tracks}
              onOpenOverlay={() => setIsOverlayOpen(true)}
            />
          </>
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 2: TIKTOK LIVE DONATIONS & SUBSCRIPTIONS CONSOLE   */}
        {/* ================================================================= */}
        {workspaceTab === 'donations_subs' && (
          <DonationsSubscriptionPanel
            engine={engine}
            availableTracks={tracks}
            onOpenOverlay={() => setIsOverlayOpen(true)}
          />
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 3: THREE.JS 3D INTERACTIVE DJ STAGE & LOWRIDER     */}
        {/* ================================================================= */}
        {workspaceTab === 'stage3d' && (
          <ThreeDJStage
            engine={engine}
            isFullscreen={is3DFullscreen}
            onToggleFullscreen={() => setIs3DFullscreen(!is3DFullscreen)}
          />
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 4: LOCAL KEY-FREE BEAT, ARTWORK & VIDEO STUDIO     */}
        {/* ================================================================= */}
        {workspaceTab === 'ai_studio' && (
          <CreativeStudio
            engine={engine}
            onAddTrackToLibrary={handleAddTrackToLibrary}
            onOpenStreamOverlay={() => setIsOverlayOpen(true)}
          />
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 5: SOUNDBOARD DROPS & REAL-TIME FX                 */}
        {/* ================================================================= */}
        {(workspaceTab === 'soundboard' || workspaceTab === 'fx') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Soundboard engine={engine} />
            <FXRack engine={engine} />
          </div>
        )}
      </main>

      {/* Stream Hub, TikTok Integrations, OBS Bridge & Overlay Customizer Modal */}
      <StreamBroadcastModal
        engine={engine}
        isOpen={isStreamModalOpen}
        onClose={() => setIsStreamModalOpen(false)}
        onOpenOverlay={() => setIsOverlayOpen(true)}
        initialTab={streamModalTab}
      />

      {/* Fullscreen TikTok / OBS Stream Overlay */}
      {isOverlayOpen && (
        <StreamOverlay
          engine={engine}
          onClose={() => setIsOverlayOpen(false)}
          onOpenSettings={() => {
            setStreamModalTab('overlay');
            setIsStreamModalOpen(true);
          }}
        />
      )}

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-800/80 px-6 py-4 bg-slate-950 text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img
            src={STUDIO_ICON_URL}
            alt="White Chocolate Studio"
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded object-cover border border-amber-400/50"
          />
          <span>White Chocolate Studio</span>
          <span aria-hidden="true">·</span>
          <span>100-Spoke Lowrider Edition</span>
          <span aria-hidden="true">·</span>
          <span>Zero API Keys Required</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
          <span>Shortcuts: Space (Deck A) · Enter (Deck B) · 1-5 (Soundbites) · 6-9 (Voice Clips)</span>
        </div>
      </footer>
    </div>
  );
}
