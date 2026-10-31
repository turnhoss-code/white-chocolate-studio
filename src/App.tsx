/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Main Application Entry (Dark Studio Edition Default)
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DJEngine } from './audio/DJEngine';
import { generateProceduralTrack, TrackMetadata } from './audio/proceduralTracks';
import { DeckView } from './components/DeckView';
import { MixerSection } from './components/MixerSection';
import { Soundboard } from './components/Soundboard';
import { FXRack } from './components/FXRack';
import { ThreeDJStage } from './components/ThreeDJStage';
import { CreativeStudio } from './components/CreativeStudio';
import { StreamBroadcastModal } from './components/StreamBroadcastModal';
import { StreamOverlay } from './components/StreamOverlay';
import { VoiceSamplerModal } from './components/VoiceSamplerModal';
import { CruiserDiagnosticsModal } from './components/CruiserDiagnosticsModal';
import { studioStorage, RecordedVoiceClip, SessionState } from './storage/studioStorage';
import { Radio, Box, Sparkles, Sliders, Disc, Mic, CheckCircle2, Palette, Moon, Gauge } from 'lucide-react';

export type ActiveWorkspaceTab = 'decks' | 'stage3d' | 'ai_studio' | 'soundboard' | 'fx';
export type MobileDeckFilter = 'both' | 'deckA' | 'mixer' | 'deckB';
export type StudioThemeId = 'dark' | 'peach' | 'mint' | 'lavender' | 'blue';

interface StudioThemeConfig {
  id: StudioThemeId;
  name: string;
  bgGradient: string;
  headerBg: string;
  cardBg: string;
  accentColor: string;
  borderTone: string;
  isDark: boolean;
}

const STUDIO_THEMES: Record<StudioThemeId, StudioThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Obsidian Lowrider (Default)',
    bgGradient: 'bg-slate-950 text-slate-100',
    headerBg: 'bg-slate-900/90 border-slate-800 text-white',
    cardBg: 'bg-slate-900/90 border-slate-800',
    accentColor: 'from-rose-600 via-pink-600 to-amber-500',
    borderTone: 'border-slate-800',
    isDark: true,
  },
  peach: {
    id: 'peach',
    name: 'Candy Peach & Crimson',
    bgGradient: 'bg-gradient-to-br from-rose-50 via-pink-50/80 to-amber-50/70 text-slate-800',
    headerBg: 'bg-white/90 border-rose-200/80 text-slate-900',
    cardBg: 'bg-white/90 border-2 border-white',
    accentColor: 'from-rose-500 to-pink-500',
    borderTone: 'border-rose-200',
    isDark: false,
  },
  mint: {
    id: 'mint',
    name: 'Pastel Mint Boulevard',
    bgGradient: 'bg-gradient-to-br from-emerald-50 via-teal-50/80 to-rose-50/70 text-slate-800',
    headerBg: 'bg-white/90 border-emerald-200/80 text-slate-900',
    cardBg: 'bg-white/90 border-2 border-white',
    accentColor: 'from-emerald-500 to-teal-500',
    borderTone: 'border-emerald-200',
    isDark: false,
  },
  lavender: {
    id: 'lavender',
    name: 'Pastel Lavender Sunset',
    bgGradient: 'bg-gradient-to-br from-purple-50 via-pink-50/80 to-sky-50/70 text-slate-800',
    headerBg: 'bg-white/90 border-purple-200/80 text-slate-900',
    cardBg: 'bg-white/90 border-2 border-white',
    accentColor: 'from-purple-600 to-pink-500',
    borderTone: 'border-purple-200',
    isDark: false,
  },
  blue: {
    id: 'blue',
    name: 'Pastel Powder Blue Cruise',
    bgGradient: 'bg-gradient-to-br from-sky-50 via-cyan-50/80 to-rose-50/70 text-slate-800',
    headerBg: 'bg-white/90 border-sky-200/80 text-slate-900',
    cardBg: 'bg-white/90 border-2 border-white',
    accentColor: 'from-sky-500 to-blue-600',
    borderTone: 'border-sky-200',
    isDark: false,
  },
};

export default function App() {
  const engine = useMemo(() => new DJEngine(), []);
  const [, setTick] = useState(0);
  const [tracks, setTracks] = useState<TrackMetadata[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  // Theme & Persistent State (Default to Dark Theme)
  const [currentTheme, setCurrentTheme] = useState<StudioThemeId>('dark');
  const [sessionRestoredNotice, setSessionRestoredNotice] = useState(false);
  const [savedVoiceClips, setSavedVoiceClips] = useState<RecordedVoiceClip[]>([]);

  // Main workspace view & mobile deck sub-filter
  const [workspaceTab, setWorkspaceTab] = useState<ActiveWorkspaceTab>('decks');
  const [mobileDeckFilter, setMobileDeckFilter] = useState<MobileDeckFilter>('both');
  const [is3DFullscreen, setIs3DFullscreen] = useState(false);

  // Modals
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isVoiceSamplerOpen, setIsVoiceSamplerOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const activeTheme = STUDIO_THEMES[currentTheme] || STUDIO_THEMES.dark;

  // Load Saved Voice Clips from File Store
  const refreshVoiceClips = useCallback(async () => {
    const clips = await studioStorage.getAllAudioClips();
    setSavedVoiceClips(clips);
  }, []);

  // Initial Load: generate tracks & restore prior session state
  useEffect(() => {
    let isMounted = true;

    async function initializeStudio() {
      try {
        // 1. Generate audio stem tracks
        const [t1, t2, t3, t4, t5] = await Promise.all([
          generateProceduralTrack('track_club'),
          generateProceduralTrack('track_lowrider'),
          generateProceduralTrack('track_trap'),
          generateProceduralTrack('track_funk'),
          generateProceduralTrack('track_afro'),
        ]);

        if (!isMounted) return;

        const loadedTracks = [t1.metadata, t2.metadata, t3.metadata, t4.metadata, t5.metadata];
        setTracks(loadedTracks);
        setIsLoadingTracks(false);

        // 2. Restore prior session state & File Store
        const [savedSession, savedClips] = await Promise.all([
          studioStorage.loadSession(),
          studioStorage.getAllAudioClips(),
        ]);

        if (!isMounted) return;

        setSavedVoiceClips(savedClips);

        if (savedSession) {
          if (savedSession.pastelTheme && STUDIO_THEMES[savedSession.pastelTheme as StudioThemeId]) {
            setCurrentTheme(savedSession.pastelTheme as StudioThemeId);
          } else {
            setCurrentTheme('dark');
          }

          if (typeof savedSession.crossfader === 'number') {
            engine.updateCrossfader(savedSession.crossfader);
          }
          if (savedSession.crossfaderCurve) {
            engine.setCrossfaderCurve(savedSession.crossfaderCurve);
          }
          if (savedSession.deckA) {
            engine.setDeckVolume('A', savedSession.deckA.volume ?? 0.85);
            engine.setEQ('A', 'high', savedSession.deckA.eqHigh ?? 0);
            engine.setEQ('A', 'mid', savedSession.deckA.eqMid ?? 0);
            engine.setEQ('A', 'low', savedSession.deckA.eqLow ?? 0);
            engine.setFilter('A', savedSession.deckA.filter ?? 0);
          }
          if (savedSession.deckB) {
            engine.setDeckVolume('B', savedSession.deckB.volume ?? 0.85);
            engine.setEQ('B', 'high', savedSession.deckB.eqHigh ?? 0);
            engine.setEQ('B', 'mid', savedSession.deckB.eqMid ?? 0);
            engine.setEQ('B', 'low', savedSession.deckB.eqLow ?? 0);
            engine.setFilter('B', savedSession.deckB.filter ?? 0);
          }

          // Restore Track Selections
          const trackA = loadedTracks.find((t) => t.id === savedSession.deckA?.trackId) || t1.metadata;
          const trackB = loadedTracks.find((t) => t.id === savedSession.deckB?.trackId) || t2.metadata;
          engine.loadTrack('A', trackA);
          engine.loadTrack('B', trackB);

          setSessionRestoredNotice(true);
          setTimeout(() => setSessionRestoredNotice(false), 4500);
        } else {
          // Default initial load
          setCurrentTheme('dark');
          engine.loadTrack('A', t1.metadata);
          engine.loadTrack('B', t2.metadata);
        }
      } catch (err) {
        console.error('Failed to initialize studio:', err);
        setIsLoadingTracks(false);
      }
    }

    initializeStudio();

    engine.registerStateListener(() => {
      setTick((t) => t + 1);
    });

    return () => {
      isMounted = false;
      engine.destroy();
    };
  }, [engine]);

  // Debounced Auto-Save Session State to IndexedDB
  useEffect(() => {
    const timer = setTimeout(() => {
      const stateToSave: Partial<SessionState> = {
        pastelTheme: currentTheme,
        crossfader: engine.crossfader,
        crossfaderCurve: engine.crossfaderCurve,
        deckA: {
          trackId: engine.deckAState.track?.id || null,
          volume: engine.deckAState.volume,
          eqHigh: engine.deckAState.eq.high,
          eqMid: engine.deckAState.eq.mid,
          eqLow: engine.deckAState.eq.low,
          filter: engine.deckAState.filter,
        },
        deckB: {
          trackId: engine.deckBState.track?.id || null,
          volume: engine.deckBState.volume,
          eqHigh: engine.deckBState.eq.high,
          eqMid: engine.deckBState.eq.mid,
          eqLow: engine.deckBState.eq.low,
          filter: engine.deckBState.filter,
        },
      };
      studioStorage.saveSession(stateToSave);
    }, 800);

    return () => clearTimeout(timer);
  }, [
    currentTheme,
    engine.crossfader,
    engine.crossfaderCurve,
    engine.deckAState.volume,
    engine.deckAState.track,
    engine.deckAState.eq,
    engine.deckAState.filter,
    engine.deckBState.volume,
    engine.deckBState.track,
    engine.deckBState.eq,
    engine.deckBState.filter,
  ]);

  // Global Keyboard Shortcuts
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
      } else if (e.key === 's' || e.key === 'S') {
        engine.syncDeck('A');
      } else if (e.key === '1') {
        engine.triggerSoundboard('vine_boom');
      } else if (e.key === '2') {
        engine.triggerSoundboard('bruh');
      } else if (e.key === '3') {
        engine.triggerSoundboard('emotional_damage');
      } else if (e.key === '4') {
        engine.triggerSoundboard('oh_no');
      } else if (e.key === '5') {
        engine.triggerSoundboard('airhorn');
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

  const isDark = activeTheme.isDark;

  return (
    <div className={`min-h-screen ${activeTheme.bgGradient} flex flex-col font-sans select-none antialiased transition-colors duration-300`}>
      {/* Top Header with Dark Lowrider Wordmark & Controls */}
      <header className={`flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b ${activeTheme.headerBg} backdrop-blur-md sticky top-0 z-40 shadow-sm`}>
        {/* Zone 1: Wordmark & Lowrider album icon */}
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src={engine.customCoverUrl}
            alt="White Chocolate Studio"
            className="w-9 h-9 rounded-xl object-cover border border-amber-500/50 shadow-md shrink-0"
          />
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setWorkspaceTab('decks');
            }}
            className="text-base sm:text-lg font-black tracking-wide text-white uppercase font-display whitespace-nowrap"
          >
            White Chocolate Studio
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-400">
          <button
            onClick={() => setWorkspaceTab('decks')}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              workspaceTab === 'decks' ? 'text-white border-rose-500' : 'border-transparent'
            }`}
          >
            DJ Decks & Mixer
          </button>
          <button
            onClick={() => setWorkspaceTab('stage3d')}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              workspaceTab === 'stage3d' ? 'text-white border-rose-500' : 'border-transparent'
            }`}
          >
            3D Lowrider Stage
          </button>
          <button
            onClick={() => setWorkspaceTab('ai_studio')}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              workspaceTab === 'ai_studio' ? 'text-white border-rose-500' : 'border-transparent'
            }`}
          >
            Music & Video Lab
          </button>
          <button
            onClick={() => setWorkspaceTab('soundboard')}
            className={`hover:text-white transition-colors whitespace-nowrap py-1 border-b-2 ${
              workspaceTab === 'soundboard' ? 'text-white border-rose-500' : 'border-transparent'
            }`}
          >
            TikTok Soundboard
          </button>
          <button
            onClick={() => setIsOverlayOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap py-1 text-rose-400 font-bold"
          >
            TikTok Overlay
          </button>
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap py-1 text-amber-400 font-bold flex items-center gap-1"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Cruiser AI</span>
          </button>
        </nav>

        {/* Zone 3: Studio Theme Switcher & Stream Hub CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Theme Switcher */}
          <div className={`hidden sm:flex items-center gap-1 p-1 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white/80 border-slate-200'} rounded-xl border shadow-xs`}>
            <button
              onClick={() => setCurrentTheme('dark')}
              title="Obsidian Dark (Default)"
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] transition-transform ${
                currentTheme === 'dark' ? 'ring-2 ring-rose-500 bg-slate-900 text-rose-400 scale-105' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            {(['peach', 'mint', 'lavender', 'blue'] as StudioThemeId[]).map((tid) => (
              <button
                key={tid}
                onClick={() => setCurrentTheme(tid)}
                title={STUDIO_THEMES[tid].name}
                className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-transform ${
                  currentTheme === tid ? 'ring-2 ring-white scale-105' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor:
                    tid === 'peach' ? '#fecdd3' : tid === 'mint' ? '#a7f3d0' : tid === 'lavender' ? '#ddd6fe' : '#bae6fd',
                }}
              />
            ))}
          </div>

          {/* Quick Cruiser AI Button */}
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className={`px-3 py-2 text-xs font-bold ${isDark ? 'text-slate-200 bg-slate-900 hover:bg-slate-800 border-slate-800' : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'} border rounded-xl shadow-xs flex items-center gap-1.5 min-h-[40px] transition-colors`}
            title="1964 Impala OBD-II diagnostics & cruise route optimizer AI"
          >
            <Gauge className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Cruiser AI</span>
          </button>

          {/* Quick Voice Sampler Button */}
          <button
            onClick={() => setIsVoiceSamplerOpen(true)}
            className={`px-3 py-2 text-xs font-bold ${isDark ? 'text-slate-200 bg-slate-900 hover:bg-slate-800 border-slate-800' : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'} border rounded-xl shadow-xs flex items-center gap-1.5 min-h-[40px] transition-colors`}
            title="Record your voice for quick FX clips"
          >
            <Mic className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Voice Sampler</span>
          </button>

          {/* Stream Hub CTA */}
          <button
            onClick={() => setIsStreamModalOpen(true)}
            className={`px-3.5 py-2 text-xs font-black text-white bg-gradient-to-r ${activeTheme.accentColor} rounded-xl shadow-md hover:shadow transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[40px] active:scale-95`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Stream Hub</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* Prior Session Restored Notification Toast */}
        {sessionRestoredNotice && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-in slide-in-from-top-2">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Prior session state & File Store audio clips restored successfully!</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">IndexedDB Active</span>
          </div>
        )}

        {/* Studio Brand Banner & Mode Switcher */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-3xl ${activeTheme.cardBg} border shadow-xl`}>
          <div className="flex items-center gap-3">
            <img
              src={engine.customCoverUrl}
              alt="White Chocolate Studio"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-2xl object-cover border border-amber-500/50 shrink-0 shadow-md"
            />
            <div>
              <div className="text-sm font-black flex items-center gap-2">
                <span>White Chocolate Live Rig</span>
                <span aria-hidden="true" className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  {activeTheme.name}
                </span>
              </div>
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} font-semibold`}>
                Dual Scratch Decks · Real-Time Tempo Sync · 1964 Impala Lowrider Stage · Lossless Voice FX
              </div>
            </div>
          </div>

          {/* Interactive Workspace Mode Switcher (44px touch targets for mobile) */}
          <div className={`flex items-center gap-1 p-1 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'} rounded-2xl border overflow-x-auto`}>
            <button
              onClick={() => setWorkspaceTab('decks')}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
                workspaceTab === 'decks'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Decks & Mixer</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('stage3d')}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
                workspaceTab === 'stage3d'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Stage</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('ai_studio')}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
                workspaceTab === 'ai_studio'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Music & Video Lab</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('soundboard')}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[42px] ${
                workspaceTab === 'soundboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>TikTok Soundboard</span>
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoadingTracks && (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-rose-400 font-mono font-bold shadow-md">
            SYNTHESIZING HIGH-FIDELITY DJ STEMS & RESTORING PRIOR SESSION...
          </div>
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 1: DUAL DJ DECKS & PRO MIXER                       */}
        {/* ================================================================= */}
        {workspaceTab === 'decks' && (
          <>
            {/* Mobile Sub-Selector for One-Handed Thumb Reach */}
            <div className={`lg:hidden flex items-center gap-1 p-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl border shadow-sm`}>
              {(
                [
                  { id: 'both', label: 'All Decks' },
                  { id: 'deckA', label: 'Deck A' },
                  { id: 'mixer', label: 'Mixer' },
                  { id: 'deckB', label: 'Deck B' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMobileDeckFilter(item.id)}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-colors min-h-[42px] whitespace-nowrap ${
                    mobileDeckFilter === item.id
                      ? 'bg-rose-600 text-white shadow-sm'
                      : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop 3-Column Layout: Deck A + Center Mixer + Deck B */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-4">
                <DeckView
                  deckId="A"
                  engine={engine}
                  state={engine.deckAState}
                  availableTracks={tracks}
                  isDark={isDark}
                />
              </div>

              <div className="lg:col-span-4">
                <MixerSection
                  engine={engine}
                  crossfader={engine.crossfader}
                  curve={engine.crossfaderCurve}
                  onCrossfaderChange={(val) => engine.updateCrossfader(val)}
                  onCurveChange={(curve) => engine.setCrossfaderCurve(curve)}
                  onOpenVoiceSampler={() => setIsVoiceSamplerOpen(true)}
                  savedClips={savedVoiceClips}
                  onTriggerCustomClip={(clipId) => {
                    const c = savedVoiceClips.find((x) => x.id === clipId);
                    if (c) engine.playCustomVoiceClip(c.id, c.blob);
                  }}
                  isDark={isDark}
                />
              </div>

              <div className="lg:col-span-4">
                <DeckView
                  deckId="B"
                  engine={engine}
                  state={engine.deckBState}
                  availableTracks={tracks}
                  isDark={isDark}
                />
              </div>
            </div>

            {/* Mobile / Tablet Responsive Deck Views */}
            <div className="lg:hidden space-y-4">
              {(mobileDeckFilter === 'both' || mobileDeckFilter === 'deckA') && (
                <DeckView
                  deckId="A"
                  engine={engine}
                  state={engine.deckAState}
                  availableTracks={tracks}
                  isDark={isDark}
                />
              )}

              {(mobileDeckFilter === 'both' || mobileDeckFilter === 'mixer') && (
                <MixerSection
                  engine={engine}
                  crossfader={engine.crossfader}
                  curve={engine.crossfaderCurve}
                  onCrossfaderChange={(val) => engine.updateCrossfader(val)}
                  onCurveChange={(curve) => engine.setCrossfaderCurve(curve)}
                  onOpenVoiceSampler={() => setIsVoiceSamplerOpen(true)}
                  savedClips={savedVoiceClips}
                  onTriggerCustomClip={(clipId) => {
                    const c = savedVoiceClips.find((x) => x.id === clipId);
                    if (c) engine.playCustomVoiceClip(c.id, c.blob);
                  }}
                  isDark={isDark}
                />
              )}

              {(mobileDeckFilter === 'both' || mobileDeckFilter === 'deckB') && (
                <DeckView
                  deckId="B"
                  engine={engine}
                  state={engine.deckBState}
                  availableTracks={tracks}
                  isDark={isDark}
                />
              )}
            </div>

            {/* Secondary Row: Real-Time DSP FX Rack & TikTok Hype Soundboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FXRack engine={engine} isDark={isDark} />
              <Soundboard
                engine={engine}
                onOpenVoiceSampler={() => setIsVoiceSamplerOpen(true)}
                savedClips={savedVoiceClips}
                onTriggerCustomClip={(clipId) => {
                  const c = savedVoiceClips.find((x) => x.id === clipId);
                  if (c) engine.playCustomVoiceClip(c.id, c.blob);
                }}
                isDark={isDark}
              />
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 2: THREE.JS 3D INTERACTIVE DJ STAGE & LOWRIDER     */}
        {/* ================================================================= */}
        {workspaceTab === 'stage3d' && (
          <ThreeDJStage
            engine={engine}
            isFullscreen={is3DFullscreen}
            onToggleFullscreen={() => setIs3DFullscreen(!is3DFullscreen)}
            isDark={isDark}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          />
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 3: MUSIC (LYRIA), IMAGE & VIDEO STUDIO             */}
        {/* ================================================================= */}
        {workspaceTab === 'ai_studio' && (
          <CreativeStudio
            engine={engine}
            onAddTrackToLibrary={handleAddTrackToLibrary}
            onOpenStreamOverlay={() => setIsOverlayOpen(true)}
          />
        )}

        {/* ================================================================= */}
        {/* WORKSPACE VIEW 4: SOUNDBOARD DROPS & REAL-TIME FX                 */}
        {/* ================================================================= */}
        {(workspaceTab === 'soundboard' || workspaceTab === 'fx') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Soundboard
              engine={engine}
              onOpenVoiceSampler={() => setIsVoiceSamplerOpen(true)}
              savedClips={savedVoiceClips}
              onTriggerCustomClip={(clipId) => {
                const c = savedVoiceClips.find((x) => x.id === clipId);
                if (c) engine.playCustomVoiceClip(c.id, c.blob);
              }}
              isDark={isDark}
            />
            <FXRack engine={engine} isDark={isDark} />
          </div>
        )}
      </main>

      {/* Stream Hub & Microphone Modal */}
      <StreamBroadcastModal
        engine={engine}
        isOpen={isStreamModalOpen}
        onClose={() => setIsStreamModalOpen(false)}
        onOpenOverlay={() => setIsOverlayOpen(true)}
      />

      {/* Fullscreen TikTok Stream Overlay */}
      {isOverlayOpen && (
        <StreamOverlay
          engine={engine}
          onClose={() => setIsOverlayOpen(false)}
        />
      )}

      {/* Quick Voice Sampler & FX Button Assign Modal */}
      <VoiceSamplerModal
        engine={engine}
        isOpen={isVoiceSamplerOpen}
        onClose={() => setIsVoiceSamplerOpen(false)}
        savedClips={savedVoiceClips}
        onRefreshClips={refreshVoiceClips}
      />

      {/* 1964 Impala Cruiser OBD-II & Route Optimizer Modal */}
      <CruiserDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        isDark={isDark}
      />

      {/* Clean Footer */}
      <footer className={`mt-auto border-t ${isDark ? 'border-slate-800 bg-slate-950/80 text-slate-500' : 'border-slate-200 bg-white/70 text-slate-500'} px-6 py-4 backdrop-blur-md text-xs flex flex-col sm:flex-row items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>White Chocolate Studio</span>
          <span aria-hidden="true">·</span>
          <span>Dark Lowrider Studio Edition</span>
          <span aria-hidden="true">·</span>
          <span>Lossless Voice Sampler & Beat Sync</span>
        </div>
        <div className={`flex items-center gap-4 text-[11px] font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <span>Shortcuts: Space (Deck A) · Enter (Deck B) · S (Sync) · 1-5 (TikTok Memes)</span>
        </div>
      </footer>
    </div>
  );
}
