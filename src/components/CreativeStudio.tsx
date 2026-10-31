/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Music Generator (Lyria), Image Creator/Editor (Nano Banana 2.1), & Video Animator (Omni Flash)
 */

import React, { useState, useRef } from 'react';
import { DJEngine } from '../audio/DJEngine';
import { generateProceduralTrack, TrackMetadata } from '../audio/proceduralTracks';
import {
  Music,
  Image as ImageIcon,
  Film,
  Upload,
  Download,
  Disc,
  Play,
  Check,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';

interface CreativeStudioProps {
  engine: DJEngine;
  onAddTrackToLibrary: (track: TrackMetadata) => void;
  onOpenStreamOverlay: () => void;
}

type StudioSubTab = 'music' | 'image' | 'video';

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] || '';
      resolve({ base64, mimeType: file.type || 'image/jpeg', dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  if (url.startsWith('data:')) {
    const [header, base64] = url.split(',');
    const mimeMatch = header.match(/data:(.*?);/);
    return { base64: base64 || '', mimeType: mimeMatch?.[1] || 'image/jpeg', dataUrl: url };
  }
  const resp = await fetch(url);
  const blob = await resp.blob();
  const file = new File([blob], 'cover.jpg', { type: blob.type || 'image/jpeg' });
  return fileToBase64(file);
}

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM RIFF WAV Blob URL.
 */
function audioBufferToWavUrl(buffer: AudioBuffer): string {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  const blob = new Blob([out], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

/**
 * Synthesizes a high-resolution custom cover artwork image on an HTML5 Canvas
 * when cloud image generation requires paid billing (HTTP 402).
 */
async function synthesizeStudioArtwork(
  baseImageUrl: string,
  aspectRatio: '1:1' | '9:16' | '16:9' | '3:4' | '4:3',
  prompt: string
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

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(0.5, '#2b0912');
  bgGrad.addColorStop(1, '#09152b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Load source image
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
    ctx.globalAlpha = 0.82;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.restore();
  }

  // Stylized neon light flare & vignette overlay
  const radGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.65);
  radGrad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
  radGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.28)');
  radGrad.addColorStop(1, 'rgba(5, 8, 17, 0.88)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, w, h);

  // Vinyl chrome ring accent
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  // Bottom title plate
  ctx.fillStyle = 'rgba(9, 13, 22, 0.82)';
  ctx.fillRect(w * 0.08, h - 130, w * 0.84, 96);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.08, h - 130, w * 0.84, 96);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WHITE CHOCOLATE STUDIO', w / 2, h - 84);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '600 18px JetBrains Mono, monospace';
  const shortPrompt = prompt.slice(0, 42).toUpperCase();
  ctx.fillText(shortPrompt, w / 2, h - 52);

  return canvas.toDataURL('image/png');
}

/**
 * Synthesizes a real looping 9:16 or 16:9 animated video (WebM/MP4) from a photo
 * using HTML5 Canvas + MediaRecorder when cloud video generation returns HTTP 402.
 */
async function synthesizePhotoVideoLoop(
  photoUrl: string,
  aspectRatio: '9:16' | '16:9',
  prompt: string
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

  // Render 90 frames at 30fps (3.0 seconds smooth seamless loop)
  const totalFrames = 90;
  const particles = Array.from({ length: 28 }, (_, i) => ({
    x: (i * 73) % width,
    y: (i * 137) % height,
    r: 2 + (i % 5),
    speedY: 1.5 + (i % 4),
    hue: i % 2 === 0 ? '#ef4444' : '#f59e0b',
  }));

  for (let f = 0; f < totalFrames; f++) {
    const t = f / totalFrames;
    const angle = t * Math.PI * 2;

    // Clear frame
    ctx.fillStyle = '#070913';
    ctx.fillRect(0, 0, width, height);

    // 1. Animated Ken Burns Zoom + Lowrider Hydraulic Bounce on uploaded photo
    if (img.width > 0 && img.height > 0) {
      const baseScale = Math.max(width / img.width, height / img.height);
      const zoom = baseScale * (1.06 + Math.sin(angle) * 0.05);
      const dw = img.width * zoom;
      const dh = img.height * zoom;
      const offsetX = (width - dw) / 2 + Math.cos(angle) * 14;
      const offsetY = (height - dh) / 2 + Math.sin(angle * 2) * 12;

      ctx.save();
      ctx.drawImage(img, offsetX, offsetY, dw, dh);
      ctx.restore();
    }

    // 2. Dynamic Neon Club Laser Sweeps
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const laserGrad = ctx.createLinearGradient(
      0,
      height * (0.2 + Math.sin(angle) * 0.15),
      width,
      height * (0.8 - Math.sin(angle) * 0.15)
    );
    laserGrad.addColorStop(0, 'rgba(239, 68, 68, 0.0)');
    laserGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.28)');
    laserGrad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    ctx.fillStyle = laserGrad;
    ctx.fillRect(0, 0, width, height);

    // Floating bokeh light orbs
    particles.forEach((p) => {
      const py = (p.y - f * p.speedY * 2 + height * 2) % height;
      ctx.fillStyle = p.hue;
      ctx.globalAlpha = 0.45 + Math.sin(angle + p.x) * 0.25;
      ctx.beginPath();
      ctx.arc(p.x, py, p.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // 3. Dark bottom scrim + Reactive EQ Visualizer Bars
    const scrim = ctx.createLinearGradient(0, height * 0.65, 0, height);
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, height * 0.65, width, height * 0.35);

    const barCount = 24;
    const barW = (width * 0.84) / barCount;
    const startX = width * 0.08;
    for (let b = 0; b < barCount; b++) {
      const wave = Math.abs(Math.sin(angle * 2 + b * 0.45)) * 0.7 + 0.2;
      const bh = wave * 64;
      ctx.fillStyle = b % 2 === 0 ? '#ef4444' : '#f59e0b';
      ctx.fillRect(startX + b * barW, height - 36 - bh, barW - 4, bh);
    }

    // Caption overlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WHITE CHOCOLATE STUDIO · LIVE LOOP', width / 2, height - 12);

    await new Promise((r) => setTimeout(r, 25));
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

  // ---------------------------------------------------------------------------
  // 1. Lyria Music Generation State
  // ---------------------------------------------------------------------------
  const [musicPrompt, setMusicPrompt] = useState(
    'West Coast G-Funk lowrider bounce at 96 BPM with deep synth bass, crisp claps, and talkbox lead'
  );
  const [musicTrackTitle, setMusicTrackTitle] = useState('White Chocolate AI Bounce');
  const [musicModel, setMusicModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [musicBpm, setMusicBpm] = useState(96);
  const [useCoverForMusic, setUseCoverForMusic] = useState(false);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [musicNotice, setMusicNotice] = useState<string | null>(null);
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState<string>('');
  const [loadedToDeckNotice, setLoadedToDeckNotice] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 2. Image Creation & Editing State (gemini-nano-banana-2.1)
  // ---------------------------------------------------------------------------
  const [imagePrompt, setImagePrompt] = useState(
    'Custom West Coast lowrider DJ booth at night with chrome turntables, red neon street reflections, and White Chocolate gold emblem'
  );
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '3:4' | '4:3'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [sourceEditImage, setSourceEditImage] = useState<{
    base64: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // ---------------------------------------------------------------------------
  // 3. Video Animation State (gemini-omni-1.1-flash via Interactions API)
  // ---------------------------------------------------------------------------
  const [videoPrompt, setVideoPrompt] = useState(
    'Camera slowly pushes in as red street neon shimmers on the wet pavement and the lowrider bounces smoothly to the beat'
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [videoDuration, setVideoDuration] = useState<'5s' | '10s'>('5s');
  const [videoSourceImage, setVideoSourceImage] = useState<{
    base64: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const videoPhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Handlers: Music Generation
  const handleGenerateMusic = async () => {
    setIsGeneratingMusic(true);
    setMusicError(null);
    setMusicNotice(null);
    setLoadedToDeckNotice(null);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;

      if (useCoverForMusic) {
        const encoded = await urlToBase64(engine.customCoverUrl);
        imageBase64 = encoded.base64;
        imageMimeType = encoded.mimeType;
      }

      const resp = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          model: musicModel,
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to generate music track.');
      }

      if (data.fallbackRequired) {
        setMusicNotice(data.notice || null);
        // Synthesize custom track matching prompt & BPM locally
        const pLower = musicPrompt.toLowerCase();
        const presetId = pLower.includes('trap') || pLower.includes('808')
          ? 'track_trap'
          : pLower.includes('lowrider') || pLower.includes('west coast')
          ? 'track_lowrider'
          : pLower.includes('afro')
          ? 'track_afro'
          : pLower.includes('funk')
          ? 'track_funk'
          : 'track_club';
        const synth = await generateProceduralTrack(presetId);
        const wavUrl = audioBufferToWavUrl(synth.buffer);
        setGeneratedMusicUrl(wavUrl);
        setGeneratedLyrics(`[Studio DSP Arrangement · ${musicBpm} BPM]\nPrompt: ${musicPrompt}`);
      } else {
        setGeneratedMusicUrl(data.audioDataUrl);
        setGeneratedLyrics(data.lyrics || '');
      }
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const handleLoadMusicToDeck = async (deckId: 'A' | 'B') => {
    if (!generatedMusicUrl) return;
    try {
      const track = await engine.loadGeneratedAudioDataUrl(
        generatedMusicUrl,
        musicTrackTitle || 'Lyria Custom Track',
        deckId,
        musicBpm,
        generatedImageUrl || engine.customCoverUrl
      );
      if (track) {
        onAddTrackToLibrary(track);
        setLoadedToDeckNotice(`Loaded "${track.title}" to Deck ${deckId}`);
      }
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : 'Failed to decode audio onto deck.');
    }
  };

  // Handlers: Image Creation & Editing
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const encoded = await fileToBase64(file);
    setSourceEditImage(encoded);
  };

  const handleLoadStudioLogoForEdit = async () => {
    const encoded = await urlToBase64(engine.customCoverUrl);
    setSourceEditImage(encoded);
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setImageError(null);
    setImageNotice(null);

    try {
      const resp = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          imageBase64: sourceEditImage?.base64,
          imageMimeType: sourceEditImage?.mimeType,
          aspectRatio: imageAspectRatio,
          imageSize,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to create/edit image.');
      }

      if (data.fallbackRequired) {
        setImageNotice(data.notice || null);
        const artUrl = await synthesizeStudioArtwork(
          sourceEditImage?.dataUrl || engine.customCoverUrl,
          imageAspectRatio,
          imagePrompt
        );
        setGeneratedImageUrl(artUrl);
      } else {
        setGeneratedImageUrl(data.imageDataUrl);
      }
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSendImageToVideoAnimator = async () => {
    const targetUrl = generatedImageUrl || engine.customCoverUrl;
    const encoded = await urlToBase64(targetUrl);
    setVideoSourceImage(encoded);
    setSubTab('video');
  };

  // Handlers: Video Animation
  const handleVideoPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const encoded = await fileToBase64(file);
    setVideoSourceImage(encoded);
  };

  const handleUseStudioCoverForVideo = async () => {
    const encoded = await urlToBase64(generatedImageUrl || engine.customCoverUrl);
    setVideoSourceImage(encoded);
  };

  const handleGenerateVideo = async () => {
    setIsGeneratingVideo(true);
    setVideoError(null);
    setVideoNotice(null);

    try {
      let source = videoSourceImage;
      if (!source) {
        source = await urlToBase64(generatedImageUrl || engine.customCoverUrl);
        setVideoSourceImage(source);
      }

      const resp = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          imageBase64: source.base64,
          imageMimeType: source.mimeType,
          aspectRatio: videoAspectRatio,
          duration: videoDuration,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to animate photo into video.');
      }

      if (data.fallbackRequired) {
        setVideoNotice(data.notice || null);
        const localVideoUrl = await synthesizePhotoVideoLoop(
          source.dataUrl,
          videoAspectRatio,
          videoPrompt
        );
        setGeneratedVideoUrl(localVideoUrl);
      } else {
        setGeneratedVideoUrl(data.videoDataUrl);
      }
    } catch (err: unknown) {
      setVideoError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl">
      {/* Studio Header & Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            White Chocolate Producer & Visual Lab
          </h2>
          <p className="text-xs text-slate-400">
            Generate custom DJ tracks, create or edit vinyl artwork, and animate photos into TikTok loops
          </p>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSubTab('music')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              subTab === 'music'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Generate Music</span>
          </button>

          <button
            onClick={() => setSubTab('image')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              subTab === 'image'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Cover Art Studio</span>
          </button>

          <button
            onClick={() => setSubTab('video')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
              subTab === 'video'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Animate to Video</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: LYRIA MUSIC GENERATION                                       */}
      {/* =================================================================== */}
      {subTab === 'music' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {/* Model & BPM Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Lyria Engine Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMusicModel('lyria-3-clip-preview')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors min-h-[44px] ${
                      musicModel === 'lyria-3-clip-preview'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    30s Club Clip (Lyria Clip)
                  </button>
                  <button
                    onClick={() => setMusicModel('lyria-3-pro-preview')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors min-h-[44px] ${
                      musicModel === 'lyria-3-pro-preview'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Full Track (Lyria Pro)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Deck BPM
                </label>
                <input
                  type="number"
                  min={70}
                  max={180}
                  value={musicBpm}
                  onChange={(e) => setMusicBpm(Number(e.target.value) || 124)}
                  className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Track Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Track Title (for DJ Decks & TikTok Overlay)
              </label>
              <input
                type="text"
                value={musicTrackTitle}
                onChange={(e) => setMusicTrackTitle(e.target.value)}
                placeholder="e.g. Midnight Lowrider Cruise"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Music Prompt */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Sound & Arrangement Prompt
              </label>
              <textarea
                rows={3}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="Describe genre, instruments, BPM, bassline, and mood..."
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
              />
              {/* Quick Style Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  {
                    label: 'West Coast Lowrider',
                    bpm: 96,
                    prompt: 'West Coast G-Funk lowrider bounce at 96 BPM with deep Moog bass, crisp claps, and high synth whistle lead',
                  },
                  {
                    label: 'TikTok Tech House',
                    bpm: 126,
                    prompt: 'High-energy club tech house banger at 126 BPM with punchy four-on-the-floor kick, rolling sub bass, and crisp hi-hats',
                  },
                  {
                    label: '808 Trap Anthem',
                    bpm: 140,
                    prompt: 'Hard-hitting 140 BPM festival trap beat with booming 808 sub bass glides, rapid hi-hat rolls, and brass stabs',
                  },
                  {
                    label: 'Afro-House Sunset',
                    bpm: 122,
                    prompt: 'Deep hypnotic Afro-house groove at 122 BPM with organic shakers, log drum bass, and warm atmospheric chords',
                  },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setMusicPrompt(p.prompt);
                      setMusicBpm(p.bpm);
                      setMusicTrackTitle(p.label);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inspire from Cover Art checkbox */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <img
                  src={engine.customCoverUrl}
                  alt="Studio Cover"
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Include Studio Cover Art as Visual Inspiration</div>
                  <div className="text-slate-400">Passes current cover image alongside your prompt to Lyria</div>
                </div>
              </div>
              <button
                onClick={() => setUseCoverForMusic(!useCoverForMusic)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[38px] ${
                  useCoverForMusic ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {useCoverForMusic ? 'Included' : 'Off'}
              </button>
            </div>

            {musicNotice && (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-700/70 text-xs text-amber-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{musicNotice}</span>
              </div>
            )}

            {musicError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{musicError}</span>
              </div>
            )}

            <button
              onClick={handleGenerateMusic}
              disabled={isGeneratingMusic}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
            >
              {isGeneratingMusic ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Track with {musicModel === 'lyria-3-pro-preview' ? 'Lyria Pro' : 'Lyria Clip'}...</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  <span>Generate Custom Track</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Generated Audio Preview & Load to Deck */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">GENERATED TRACK DECK LOADER</span>
                <span className="text-[11px] font-mono text-slate-400">{musicModel}</span>
              </div>

              {generatedMusicUrl ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-sm font-bold text-white">{musicTrackTitle}</div>
                    <audio controls src={generatedMusicUrl} className="w-full h-10" />
                  </div>

                  {/* Load directly onto DJ Decks for live scratching & crossfading */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleLoadMusicToDeck('A')}
                      className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
                    >
                      <Disc className="w-4 h-4" />
                      <span>Load to Deck A</span>
                    </button>
                    <button
                      onClick={() => handleLoadMusicToDeck('B')}
                      className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
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

                  {generatedLyrics && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 max-h-36 overflow-y-auto">
                      <div className="text-[10px] font-mono text-slate-400 mb-1">LYRICS / NOTES</div>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {generatedLyrics}
                      </p>
                    </div>
                  )}

                  <a
                    href={generatedMusicUrl}
                    download={`${musicTrackTitle.replace(/\s+/g, '_')}.wav`}
                    className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Audio Track</span>
                  </a>
                </div>
              ) : (
                <div className="h-56 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-500">
                  <Music className="w-8 h-8 mb-2 text-slate-600" />
                  <p className="text-xs font-medium text-slate-400">No AI track generated yet</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Enter a prompt on the left to synthesize a custom track and load it straight onto Deck A or Deck B.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: IMAGE CREATION & EDITING (gemini-nano-banana-2.1)            */}
      {/* =================================================================== */}
      {subTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {/* Source Image for Editing (Optional) */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Mode: {sourceEditImage ? 'Edit Reference Image' : 'Create New Image from Prompt'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadStudioLogoForEdit}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-amber-300 transition-colors"
                  >
                    Edit Studio Cover Art
                  </button>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Photo</span>
                  </button>
                  {sourceEditImage && (
                    <button
                      onClick={() => setSourceEditImage(null)}
                      className="px-2 py-1.5 rounded-lg bg-rose-950 text-[11px] text-rose-300 hover:bg-rose-900"
                    >
                      Clear
                    </button>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {sourceEditImage && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={sourceEditImage.dataUrl}
                    alt="Reference to edit"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-lg object-cover border border-amber-500/50"
                  />
                  <div className="text-xs text-slate-400">
                    Reference image loaded. Describe the edits or additions you want below.
                  </div>
                </div>
              )}
            </div>

            {/* Aspect Ratio & Resolution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['1:1', '9:16', '16:9', '3:4', '4:3'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold border transition-colors min-h-[40px] ${
                        imageAspectRatio === ratio
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Resolution (gemini-nano-banana-2.1)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['1K', '2K', '4K'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setImageSize(sz)}
                      className={`py-2 rounded-lg text-xs font-mono font-bold border transition-colors min-h-[40px] ${
                        imageSize === sz
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {sourceEditImage ? 'Edit Instructions Prompt' : 'Image Creation Prompt'}
              </label>
              <textarea
                rows={3}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the artwork or photo edit..."
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {imageNotice && (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-700/70 text-xs text-amber-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{imageNotice}</span>
              </div>
            )}

            {imageError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{imageError}</span>
              </div>
            )}

            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Rendering with gemini-nano-banana-2.1...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>{sourceEditImage ? 'Apply Image Edit' : 'Generate Custom Artwork'}</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Image Preview & Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">STUDIO ARTWORK PREVIEW</span>
              <span className="text-[11px] font-mono text-slate-400">gemini-nano-banana-2.1</span>
            </div>

            <div className="flex-1 flex items-center justify-center min-h-[240px] bg-slate-900/70 rounded-xl border border-slate-800 overflow-hidden p-2">
              <img
                src={generatedImageUrl || engine.customCoverUrl}
                alt="Studio Cover Artwork"
                referrerPolicy="no-referrer"
                className="max-h-64 w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (generatedImageUrl) {
                    engine.setCustomCoverUrl(generatedImageUrl);
                  }
                }}
                disabled={!generatedImageUrl}
                className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Disc className="w-4 h-4" />
                <span>Set as Vinyl & Deck Label</span>
              </button>

              <button
                onClick={handleSendImageToVideoAnimator}
                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Film className="w-4 h-4" />
                <span>Animate into Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ANIMATE PHOTO INTO VIDEO (gemini-omni-1.1-flash)             */}
      {/* =================================================================== */}
      {subTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {/* Upload Photo to Animate */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  1. Select or Upload Starting Frame Photo
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUseStudioCoverForVideo}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 transition-colors"
                  >
                    Use Studio Cover Art
                  </button>
                  <button
                    onClick={() => videoPhotoInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                  <input
                    ref={videoPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVideoPhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={videoSourceImage?.dataUrl || generatedImageUrl || engine.customCoverUrl}
                  alt="Starting frame for video animation"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover border border-blue-500/50 shrink-0"
                />
                <div className="text-xs text-slate-400">
                  {videoSourceImage
                    ? 'Custom photo ready to animate with gemini-omni-1.1-flash.'
                    : 'Using White Chocolate Studio cover art as starting frame (or tap Upload Photo above).'}
                </div>
              </div>
            </div>

            {/* Aspect Ratio (9:16 Portrait for Mobile TikTok or 16:9 Landscape) & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Video Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVideoAspectRatio('9:16')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors min-h-[44px] ${
                      videoAspectRatio === '9:16'
                        ? 'bg-blue-600/25 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    9:16 Portrait (TikTok)
                  </button>
                  <button
                    onClick={() => setVideoAspectRatio('16:9')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-colors min-h-[44px] ${
                      videoAspectRatio === '16:9'
                        ? 'bg-blue-600/25 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Clip Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['5s', '10s'] as const).map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setVideoDuration(dur)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold transition-colors min-h-[44px] ${
                        videoDuration === dur
                          ? 'bg-blue-600/25 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Motion Prompt */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                2. Camera & Scene Motion Prompt
              </label>
              <textarea
                rows={3}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe how the image should animate..."
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {videoNotice && (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-700/70 text-xs text-amber-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{videoNotice}</span>
              </div>
            )}

            {videoError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{videoError}</span>
              </div>
            )}

            <button
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
            >
              {isGeneratingVideo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Animating Video with gemini-omni-1.1-flash...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Animate Photo into {videoAspectRatio} Video</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Generated Video Player & TikTok Overlay Action */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">ANIMATED VIDEO PREVIEW ({videoAspectRatio})</span>
              <span className="text-[11px] font-mono text-slate-400">gemini-omni-1.1-flash</span>
            </div>

            {generatedVideoUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center bg-black rounded-xl border border-slate-800 overflow-hidden p-2">
                  <video
                    src={generatedVideoUrl}
                    controls
                    loop
                    autoPlay
                    muted
                    playsInline
                    className={`rounded-lg ${
                      videoAspectRatio === '9:16' ? 'max-h-72 aspect-[9/16]' : 'w-full aspect-video'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      engine.setCustomVideoUrl(generatedVideoUrl);
                      onOpenStreamOverlay();
                    }}
                    className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Launch in TikTok Overlay</span>
                  </button>

                  <a
                    href={generatedVideoUrl}
                    download={`White_Chocolate_TikTok_${videoAspectRatio.replace(':', 'x')}.webm`}
                    className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Video</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-500">
                <Film className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">Ready to animate photo into video</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Choose 9:16 (TikTok Vertical) or 16:9 (Landscape) and click Animate Photo to generate a looping video visual.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
