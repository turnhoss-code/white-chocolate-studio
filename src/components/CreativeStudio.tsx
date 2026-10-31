/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Local Key-Free Beat Synthesizer, 100-Spoke Cover Art Designer & Video Loop Animator
 */

import React, { useState, useRef } from 'react';
import { DJEngine } from '../audio/DJEngine';
import {
  generateProceduralTrack,
  TrackMetadata,
  audioBufferToWavUrl,
  STUDIO_ICON_URL,
} from '../audio/proceduralTracks';
import {
  Music,
  Image as ImageIcon,
  Film,
  Upload,
  Download,
  Disc,
  Check,
  RefreshCw,
} from 'lucide-react';

interface CreativeStudioProps {
  engine: DJEngine;
  onAddTrackToLibrary: (track: TrackMetadata) => void;
  onOpenStreamOverlay: () => void;
}

type StudioSubTab = 'music' | 'image' | 'video';

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Synthesizes high-resolution custom Lowrider 100-Spoke Chrome Wheel & Bullet Cap cover artwork
 * directly on an HTML5 Canvas — 100% key-free and instant.
 */
async function synthesizeLowriderArtwork(
  baseImageUrl: string,
  aspectRatio: '1:1' | '9:16' | '16:9' | '3:4' | '4:3',
  titleText: string,
  theme: 'candy_red' | 'gold_24k' | 'cobalt_chrome' | 'emerald_hop'
): Promise<string> {
  const dims: Record<string, [number, number]> = {
    '1:1': [1024, 1024],
    '9:16': [576, 1024],
    '16:9': [1024, 576],
    '3:4': [768, 1024],
    '4:3': [1024, 768],
  };
  const [w, h] = dims[aspectRatio] || [1024, 1024];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const palette = {
    candy_red: { c1: '#1a0408', c2: '#991b1b', accent: '#ef4444', sub: '#fbbf24' },
    gold_24k: { c1: '#171103', c2: '#78350f', accent: '#f59e0b', sub: '#fef08a' },
    cobalt_chrome: { c1: '#040d21', c2: '#1e3a8a', accent: '#3b82f6', sub: '#e2e8f0' },
    emerald_hop: { c1: '#031710', c2: '#065f46', accent: '#10b981', sub: '#fbbf24' },
  }[theme];

  // Candy metallic background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, palette.c1);
  bgGrad.addColorStop(0.5, palette.c2);
  bgGrad.addColorStop(1, '#050811');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Load base studio photo
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = baseImageUrl;
  });

  if (img.width > 0 && img.height > 0) {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.save();
    ctx.globalAlpha = 0.68;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.restore();
  }

  // Draw 100-Spoke Chrome Wheel & Bullet Centercap Geometric Overlay
  const cx = w / 2;
  const cy = h * 0.44;
  const outerR = Math.min(w, h) * 0.34;
  const innerR = outerR * 0.3;

  // Whitewall ring
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.lineWidth = outerR * 0.06;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 1.06, 0, Math.PI * 2);
  ctx.stroke();

  // Chrome Rim Barrel
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = outerR * 0.08;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  // 100 Laced Chrome Spokes
  ctx.save();
  for (let i = 0; i < 100; i++) {
    const a1 = (i / 100) * Math.PI * 2 + (i % 2 === 0 ? 0.18 : -0.18);
    const a2 = (i / 100) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(148,163,184,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR);
    ctx.lineTo(cx + Math.cos(a2) * (outerR * 0.95), cy + Math.sin(a2) * (outerR * 0.95));
    ctx.stroke();
  }
  ctx.restore();

  // Chrome Bullet Centercap
  const bulletGrad = ctx.createRadialGradient(
    cx - innerR * 0.2,
    cy - innerR * 0.2,
    2,
    cx,
    cy,
    innerR
  );
  bulletGrad.addColorStop(0, '#ffffff');
  bulletGrad.addColorStop(0.45, '#cbd5e1');
  bulletGrad.addColorStop(0.85, '#334155');
  bulletGrad.addColorStop(1, '#f8fafc');
  ctx.fillStyle = bulletGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  // Bottom Lowrider Chrome Nameplate
  ctx.fillStyle = 'rgba(5, 8, 17, 0.88)';
  ctx.fillRect(w * 0.08, h - 140, w * 0.84, 102);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(w * 0.08, h - 140, w * 0.84, 102);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WHITE CHOCOLATE STUDIO', w / 2, h - 92);

  ctx.fillStyle = palette.sub;
  ctx.font = '700 18px JetBrains Mono, monospace';
  ctx.fillText(titleText.slice(0, 40).toUpperCase(), w / 2, h - 58);

  return canvas.toDataURL('image/png');
}

/**
 * Synthesizes a looping 9:16 or 16:9 animated video (WebM) from a photo with 100-spoke rim spin
 * and hydraulic lowrider bounce — 100% local in browser with zero API keys.
 */
async function synthesizePhotoVideoLoop(
  photoUrl: string,
  aspectRatio: '9:16' | '16:9',
  captionText: string
): Promise<string> {
  const width = aspectRatio === '9:16' ? 540 : 960;
  const height = aspectRatio === '9:16' ? 960 : 540;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = photoUrl;
  });

  const stream = canvas.captureStream(30);
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = '';
    }
  }

  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<string>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };
  });

  recorder.start(100);

  const totalFrames = 75;
  for (let f = 0; f < totalFrames; f++) {
    const t = f / totalFrames;
    const angle = t * Math.PI * 2;

    ctx.fillStyle = '#070913';
    ctx.fillRect(0, 0, width, height);

    if (img.width > 0 && img.height > 0) {
      const baseScale = Math.max(width / img.width, height / img.height);
      const zoom = baseScale * (1.06 + Math.sin(angle) * 0.05);
      const dw = img.width * zoom;
      const dh = img.height * zoom;
      const offsetX = (width - dw) / 2 + Math.cos(angle) * 12;
      const offsetY = (height - dh) / 2 + Math.sin(angle * 2) * 14;

      ctx.save();
      ctx.drawImage(img, offsetX, offsetY, dw, dh);
      ctx.restore();
    }

    // Spinning 100-spoke chrome wheel watermark in center
    const cx = width / 2;
    const cy = height * 0.45;
    const rimR = Math.min(width, height) * 0.26;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.stroke();

    for (let s = 0; s < 50; s++) {
      const sa = (s / 50) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa + 0.2) * (rimR * 0.25), Math.sin(sa + 0.2) * (rimR * 0.25));
      ctx.lineTo(Math.cos(sa) * rimR, Math.sin(sa) * rimR);
      ctx.stroke();
    }
    ctx.restore();

    // Scrim + EQ Bars
    const scrim = ctx.createLinearGradient(0, height * 0.65, 0, height);
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, height * 0.65, width, height * 0.35);

    const barCount = 24;
    const barW = (width * 0.84) / barCount;
    const startX = width * 0.08;
    for (let b = 0; b < barCount; b++) {
      const wave = Math.abs(Math.sin(angle * 2 + b * 0.45)) * 0.7 + 0.2;
      const bh = wave * 60;
      ctx.fillStyle = b % 2 === 0 ? '#ef4444' : '#f59e0b';
      ctx.fillRect(startX + b * barW, height - 38 - bh, barW - 4, bh);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(captionText.slice(0, 36).toUpperCase(), width / 2, height - 14);

    await new Promise((r) => setTimeout(r, 20));
  }

  recorder.stop();
  return recordingPromise;
}

export const CreativeStudio: React.FC<CreativeStudioProps> = ({
  engine,
  onAddTrackToLibrary,
  onOpenStreamOverlay,
}) => {
  const [subTab, setSubTab] = useState<StudioSubTab>('music');

  // 1. Local Beat & Stem Synthesizer State
  const [selectedStyleId, setSelectedStyleId] = useState<string>('track_lowrider');
  const [musicTrackTitle, setMusicTrackTitle] = useState('Crenshaw 100-Spoke Bounce');
  const [musicBpm, setMusicBpm] = useState(94);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);
  const [loadedToDeckNotice, setLoadedToDeckNotice] = useState<string | null>(null);

  // 2. Local 100-Spoke Cover Art Studio State
  const [artTitle, setArtTitle] = useState('100-SPOKE CHROME & BULLET CAPS');
  const [artTheme, setArtTheme] = useState<
    'candy_red' | 'gold_24k' | 'cobalt_chrome' | 'emerald_hop'
  >('candy_red');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '3:4' | '4:3'>(
    '1:1'
  );
  const [sourcePhotoUrl, setSourcePhotoUrl] = useState<string>(STUDIO_ICON_URL);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // 3. Local Video Loop Animator State
  const [videoCaption, setVideoCaption] = useState('WHITE CHOCOLATE · 100 SPOKE LIVE MIX');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>(STUDIO_ICON_URL);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const videoPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const handleSynthesizeBeat = async () => {
    setIsGeneratingMusic(true);
    setLoadedToDeckNotice(null);
    try {
      const synth = await generateProceduralTrack(selectedStyleId, 44100, {
        title: musicTrackTitle,
        bpm: musicBpm,
        coverImage: generatedImageUrl || engine.customCoverUrl,
      });
      const wavUrl = audioBufferToWavUrl(synth.buffer);
      setGeneratedMusicUrl(wavUrl);
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const handleLoadMusicToDeck = async (deckId: 'A' | 'B') => {
    if (!generatedMusicUrl) return;
    const track = await engine.loadGeneratedAudioDataUrl(
      generatedMusicUrl,
      musicTrackTitle,
      deckId,
      musicBpm,
      generatedImageUrl || engine.customCoverUrl
    );
    if (track) {
      onAddTrackToLibrary(track);
      setLoadedToDeckNotice(`Loaded "${track.title}" to Deck ${deckId}`);
    }
  };

  const handleGenerateArtwork = async () => {
    setIsGeneratingImage(true);
    try {
      const artUrl = await synthesizeLowriderArtwork(
        sourcePhotoUrl,
        imageAspectRatio,
        artTitle,
        artTheme
      );
      setGeneratedImageUrl(artUrl);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideoLoop = async () => {
    setIsGeneratingVideo(true);
    try {
      const vidUrl = await synthesizePhotoVideoLoop(
        videoSourceUrl,
        videoAspectRatio,
        videoCaption
      );
      setGeneratedVideoUrl(vidUrl);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Top Chrome Pinstripe */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background:
            'linear-gradient(90deg, #94a3b8 0%, #f59e0b 30%, #ef4444 70%, #94a3b8 100%)',
        }}
      />

      {/* Studio Header & Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Lowrider Beat Synthesizer &amp; 100-Spoke Visual Lab
          </h2>
          <p className="text-xs text-slate-400">
            100% Local Browser DSP &amp; Canvas Engine · Zero API Keys Required
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSubTab('music')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              subTab === 'music'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Beat Synthesizer</span>
          </button>

          <button
            onClick={() => setSubTab('image')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              subTab === 'image'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>100-Spoke Cover Art</span>
          </button>

          <button
            onClick={() => setSubTab('video')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              subTab === 'video'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>TikTok Video Loop</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LOCAL LOWRIDER BEAT SYNTHESIZER */}
      {subTab === 'music' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Lowrider &amp; Studio Arrangement Engine
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'track_lowrider', label: 'West Coast G-Funk', bpm: 94 },
                  { id: 'track_slowjam', label: '90s Midnight Slow Jam', bpm: 86 },
                  { id: 'track_chopped', label: 'Chopped & Screwed', bpm: 76 },
                  { id: 'track_trap', label: '808 Candy Paint Bounce', bpm: 140 },
                  { id: 'track_funk', label: 'Talkbox Boogie Funk', bpm: 106 },
                  { id: 'track_club', label: '2000s Club Anthem', bpm: 102 },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStyleId(st.id);
                      setMusicBpm(st.bpm);
                      setMusicTrackTitle(st.label);
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-colors ${
                      selectedStyleId === st.id
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div>{st.label}</div>
                    <div className="text-[10px] font-mono text-amber-400 mt-0.5">
                      {st.bpm} BPM
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom Stem / Track Title
                </label>
                <input
                  type="text"
                  value={musicTrackTitle}
                  onChange={(e) => setMusicTrackTitle(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target BPM (65–180)
                </label>
                <input
                  type="number"
                  min={65}
                  max={180}
                  value={musicBpm}
                  onChange={(e) => setMusicBpm(Number(e.target.value) || 94)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-amber-400"
                />
              </div>
            </div>

            <button
              onClick={handleSynthesizeBeat}
              disabled={isGeneratingMusic}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              {isGeneratingMusic ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Stereo WAV Arrangement...</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  <span>Synthesize Custom Studio Track (Instant · No API Key)</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="text-xs font-bold text-slate-300">
              SYNTHESIZED TRACK PREVIEW &amp; DECK LOADER
            </div>

            {generatedMusicUrl ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-sm font-bold text-white">{musicTrackTitle}</div>
                  <audio controls src={generatedMusicUrl} className="w-full h-10" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleLoadMusicToDeck('A')}
                    className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Disc className="w-4 h-4" />
                    <span>Load to Deck A</span>
                  </button>
                  <button
                    onClick={() => handleLoadMusicToDeck('B')}
                    className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Disc className="w-4 h-4" />
                    <span>Load to Deck B</span>
                  </button>
                </div>

                {loadedToDeckNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>{loadedToDeckNotice}</span>
                  </div>
                )}

                <a
                  href={generatedMusicUrl}
                  download={`${musicTrackTitle.replace(/\s+/g, '_')}.wav`}
                  className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Stereo WAV File</span>
                </a>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-500">
                <Music className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">
                  Pick a track style and click Synthesize to generate a fresh WAV stem
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 100-SPOKE CHROME COVER ART DESIGNER */}
      {subTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={sourcePhotoUrl}
                  alt="Base Cover"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-lg object-cover border border-amber-400"
                />
                <div className="text-xs">
                  <div className="font-bold text-white">Base Background Photo</div>
                  <div className="text-slate-400">
                    Uses White Chocolate Studio Icon or your uploaded photo
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSourcePhotoUrl(STUDIO_ICON_URL)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300"
                >
                  Reset to Studio JPG
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) setSourcePhotoUrl(await fileToDataUrl(f));
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Lowrider Candy Paint Theme
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'candy_red', label: 'Candy Apple Red' },
                      { id: 'gold_24k', label: '24K Chrome Gold' },
                      { id: 'cobalt_chrome', label: 'Cobalt Blue' },
                      { id: 'emerald_hop', label: 'Emerald Green' },
                    ] as const
                  ).map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setArtTheme(th.id)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold border ${
                        artTheme === th.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['1:1', '9:16', '16:9', '3:4', '4:3'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold border ${
                        imageAspectRatio === ratio
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Custom Plate Banner Text
              </label>
              <input
                type="text"
                value={artTitle}
                onChange={(e) => setArtTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>

            <button
              onClick={handleGenerateArtwork}
              disabled={isGeneratingImage}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Render 100-Spoke Chrome Wheel Artwork</span>
            </button>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="text-xs font-bold text-slate-300">STUDIO ARTWORK PREVIEW</div>
            <div className="flex-1 flex items-center justify-center min-h-[220px] bg-slate-900/70 rounded-xl border border-slate-800 overflow-hidden p-2">
              <img
                src={generatedImageUrl || engine.customCoverUrl}
                alt="Studio Cover Artwork"
                referrerPolicy="no-referrer"
                className="max-h-60 w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (generatedImageUrl) engine.setCustomCoverUrl(generatedImageUrl);
                }}
                disabled={!generatedImageUrl}
                className="h-10 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Disc className="w-3.5 h-3.5" />
                <span>Apply to Decks</span>
              </button>
              <a
                href={generatedImageUrl || engine.customCoverUrl}
                download="White_Chocolate_100Spoke_Cover.png"
                className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TIKTOK VIDEO LOOP ANIMATOR */}
      {subTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={videoSourceUrl}
                  alt="Video Source"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-lg object-cover border border-blue-400"
                />
                <div className="text-xs">
                  <div className="font-bold text-white">Source Photo for Video Loop</div>
                  <div className="text-slate-400">
                    Animates hydraulic bounce, 100-spoke rim spin, and EQ spectrum
                  </div>
                </div>
              </div>
              <button
                onClick={() => videoPhotoInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
              <input
                ref={videoPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setVideoSourceUrl(await fileToDataUrl(f));
                }}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Video Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['9:16', '16:9'] as const).map((asp) => (
                    <button
                      key={asp}
                      onClick={() => setVideoAspectRatio(asp)}
                      className={`py-2.5 rounded-xl text-xs font-mono font-bold border ${
                        videoAspectRatio === asp
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {asp === '9:16' ? '9:16 TikTok' : '16:9 OBS'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Video Overlay Title
                </label>
                <input
                  type="text"
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateVideoLoop}
              disabled={isGeneratingVideo}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-rose-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              {isGeneratingVideo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Rendering 30FPS Lowrider Video Loop...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Render Animated Stream Video Loop</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="text-xs font-bold text-slate-300">VIDEO LOOP PREVIEW</div>
            {generatedVideoUrl ? (
              <div className="space-y-3">
                <video
                  src={generatedVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="max-h-60 w-auto mx-auto rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      engine.setCustomVideoUrl(generatedVideoUrl);
                      onOpenStreamOverlay();
                    }}
                    className="h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <span>Use as Stream Backdrop</span>
                  </button>
                  <a
                    href={generatedVideoUrl}
                    download="White_Chocolate_TikTok_Loop.webm"
                    className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Video</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-500">
                <Film className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">
                  Click Render Animated Stream Video Loop to create a custom background video
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
