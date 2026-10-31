/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Lowrider & Studio Procedural Track Synthesizer, WAV Exporter & Soundboard Generator
 */

export const STUDIO_ICON_URL = '/assets/aistudio/white_chocolate_studio_ce8a694c.JPG';

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // in seconds
  genre: string;
  key: string;
  color: string;
  coverImage?: string;
  buffer?: AudioBuffer;
  waveformData?: number[];
}

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM RIFF WAV Blob.
 */
export function encodeAudioBufferToWavBlob(buffer: AudioBuffer): Blob {
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
      let sample = Math.max(-1, Math.min(1, channels[i][offset] || 0));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

export function audioBufferToWavUrl(buffer: AudioBuffer): string {
  return URL.createObjectURL(encodeAudioBufferToWavBlob(buffer));
}

export function downloadAudioBufferAsWav(buffer: AudioBuffer, filename: string) {
  const url = audioBufferToWavUrl(buffer);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = filename.replace(/[^a-zA-Z0-9_-]/g, '_') || 'White_Chocolate_Track';
  a.download = cleanName.endsWith('.wav') ? cleanName : `${cleanName}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Procedurally generates rich, multi-layered Rap, R&B, and Lowrider DJ tracks using OfflineAudioContext.
 * Zero external API keys required — renders in milliseconds in browser memory.
 */
export async function generateProceduralTrack(
  id: string,
  sampleRate: number = 44100,
  customOptions?: {
    title?: string;
    bpm?: number;
    genre?: string;
    coverImage?: string;
  }
): Promise<{ buffer: AudioBuffer; metadata: TrackMetadata; waveform: number[] }> {
  let bpm = 94;
  let title = 'Crenshaw 100-Spoke Bounce';
  let artist = 'DJ White Chocolate';
  let genre = 'West Coast G-Funk Rap';
  let key = 'D minor';
  let color = '#f59e0b';
  let durationBars = 32;

  if (id === 'track_lowrider') {
    bpm = 94;
    title = 'Crenshaw 100-Spoke Bounce';
    artist = 'White Chocolate & DJ Chrome';
    genre = 'West Coast G-Funk Rap';
    key = 'D minor';
    color = '#f59e0b';
  } else if (id === 'track_rnb_slowjam') {
    bpm = 86;
    title = 'Midnight Silk & Bullet Caps';
    artist = 'White Chocolate R&B Lab';
    genre = '90s R&B Slow Jam';
    key = 'F minor';
    color = '#ec4899';
  } else if (id === 'track_trap') {
    bpm = 140;
    title = 'Candy Paint 808 Anthem';
    artist = 'White Chocolate';
    genre = 'Dirty South / 808 Rap';
    key = 'C minor';
    color = '#ef4444';
  } else if (id === 'track_chopped') {
    bpm = 76;
    title = 'Houston Slab Sippin (Chopped)';
    artist = 'DJ White Chocolate';
    genre = 'Chopped & Screwed Rap';
    key = 'G minor';
    color = '#a855f7';
  } else if (id === 'track_funk') {
    bpm = 106;
    title = 'Chrome Boulevard Talkbox';
    artist = 'White Chocolate Studio';
    genre = 'Boogie Funk / R&B';
    key = 'A minor';
    color = '#10b981';
  } else if (id === 'track_afro') {
    bpm = 118;
    title = 'Velvet Sunset Neo-Soul Bounce';
    artist = 'DJ White Chocolate';
    genre = 'Afro-R&B / Club Flip';
    key = 'E minor';
    color = '#3b82f6';
  } else {
    bpm = 102;
    title = 'TikTok Live Rap Cypher Beat';
    artist = 'White Chocolate';
    genre = '2000s Club Rap / R&B';
    key = 'F minor';
    color = '#ef4444';
  }

  if (customOptions?.bpm) bpm = customOptions.bpm;
  if (customOptions?.title) title = customOptions.title;
  if (customOptions?.genre) genre = customOptions.genre;

  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;
  const totalDuration = durationBars * barSec;
  const totalSamples = Math.ceil(sampleRate * totalDuration);

  // Render stereo audio buffer offline
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  // Build rhythm and stems based on track style
  buildArrangement(offlineCtx, id, bpm, durationBars, beatSec);

  const renderedBuffer = await offlineCtx.startRendering();
  const waveform = extractWaveform(renderedBuffer, 160);

  const metadata: TrackMetadata = {
    id: customOptions?.title ? `${id}_${Date.now()}` : id,
    title,
    artist,
    bpm,
    duration: totalDuration,
    genre,
    key,
    color,
    coverImage: customOptions?.coverImage || STUDIO_ICON_URL,
    buffer: renderedBuffer,
    waveformData: waveform,
  };

  return { buffer: renderedBuffer, metadata, waveform };
}

/**
 * Synthesizes a short DJ Voice Tag / Vocal Drop buffer for the swappable Mixer Voice Clip Slots
 * so all slots work immediately out of the box even before recording from a hardware mic.
 */
export async function synthesizeVoiceClipPreset(
  presetIndex: number,
  sampleRate: number = 44100
): Promise<{ buffer: AudioBuffer; label: string; duration: number }> {
  const presets = [
    { label: 'DJ TAG: WHITE CHOCOLATE', pitch: 125, mod: 6, dur: 1.8, style: 'talkbox' },
    { label: 'WEST COAST ROLL CALL', pitch: 110, mod: 4, dur: 2.1, style: 'westcoast' },
    { label: 'CHOPPED & SCREWED DROP', pitch: 78, mod: 3, dur: 2.2, style: 'screwed' },
    { label: '100 SPOKE CHROME HYPE', pitch: 145, mod: 8, dur: 1.7, style: 'hype' },
    { label: 'R&B SLOW JAM INTRO', pitch: 165, mod: 5, dur: 2.0, style: 'rnb' },
    { label: 'TIKTOK TAP THE SCREEN', pitch: 135, mod: 7, dur: 1.9, style: 'radio' },
  ];

  const cfg = presets[presetIndex % presets.length];
  const samples = Math.ceil(sampleRate * cfg.dur);
  const ctx = new OfflineAudioContext(2, samples, sampleRate);

  // Syllabic vocal formant cadence + talkbox/synth carrier
  const syllables = [0, 0.28, 0.56, 0.88, 1.22];
  syllables.forEach((t, idx) => {
    if (t >= cfg.dur - 0.15) return;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const f1 = ctx.createBiquadFilter();
    const f2 = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    sub.type = 'square';

    const noteMult = [1, 1.12, 1.25, 0.94, 1.18][idx % 5];
    const baseFreq = cfg.pitch * noteMult;

    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.92, t + 0.24);
    sub.frequency.setValueAtTime(baseFreq * 0.5, t);

    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(550 + idx * 140, t);
    f1.frequency.linearRampToValueAtTime(780 - idx * 60, t + 0.22);
    f1.Q.setValueAtTime(4.5, t);

    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(1450 + (idx % 2) * 450, t);
    f2.Q.setValueAtTime(5.5, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.65, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(f1);
    osc.connect(f2);
    sub.connect(f1);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
    sub.start(t);
    sub.stop(t + 0.26);
  });

  // Add subtle 808/chime accent underneath the vocal tag
  if (cfg.style === 'rnb') {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      scheduleSynthLead(ctx, i * 0.12, freq, 0.9, 0.16, 'sine');
    });
  } else {
    scheduleKick(ctx, 0, 52, 0.45, 0.7);
  }

  const buffer = await ctx.startRendering();
  return { buffer, label: cfg.label, duration: cfg.dur };
}

function buildArrangement(
  ctx: OfflineAudioContext,
  id: string,
  bpm: number,
  bars: number,
  beatSec: number
) {
  const barSec = beatSec * 4;

  for (let b = 0; b < bars; b++) {
    const barStart = b * barSec;
    const isDrop = (b >= 2 && b < 14) || (b >= 16 && b < 30);

    if (id === 'track_lowrider') {
      // 94 BPM West Coast G-Funk Rap
      scheduleKick(ctx, barStart, 55, 0.35, 1.05);
      scheduleKick(ctx, barStart + beatSec * 1.75, 50, 0.25, 0.75);
      scheduleKick(ctx, barStart + beatSec * 2.5, 54, 0.32, 0.95);

      // Crisp West Coast Claps / Snares on 2 and 4
      scheduleSnare(ctx, barStart + beatSec, 0.16, 0.85, true);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.16, 0.85, true);

      // Swung 16th Hi-hats
      for (let s = 0; s < 16; s++) {
        const swing = s % 2 === 1 ? 0.026 : 0;
        const time = barStart + s * (beatSec / 4) + swing;
        const vel = s % 4 === 0 ? 0.6 : s % 2 === 0 ? 0.4 : 0.25;
        scheduleHiHat(ctx, time, s === 14, vel * 0.72);
      }

      // Iconic West Coast High Sine Whistle Lead
      if (isDrop) {
        scheduleSynthLead(ctx, barStart + beatSec * 0.5, 587.33, beatSec * 1.4, 0.26, 'sine'); // D5
        scheduleSynthLead(ctx, barStart + beatSec * 2.0, 698.46, beatSec * 0.9, 0.24, 'sine'); // F5
        scheduleSynthLead(ctx, barStart + beatSec * 3.0, 659.25, beatSec * 0.9, 0.25, 'sine'); // E5
      }

      // Moog Lowrider Sub-Funk Bassline (D minor)
      const bassNotes = [73.42, 73.42, 87.31, 98.0, 73.42, 65.41];
      bassNotes.forEach((freq, idx) => {
        scheduleBass(ctx, barStart + idx * (beatSec * 0.66), freq, beatSec * 0.52, 0.58, 'sawtooth');
      });

    } else if (id === 'track_rnb_slowjam') {
      // 86 BPM 90s R&B Slow Jam (Electric Piano Chords + Deep Sub + Finger Snaps)
      scheduleKick(ctx, barStart, 48, 0.42, 0.95);
      scheduleKick(ctx, barStart + beatSec * 1.5, 45, 0.32, 0.68);
      scheduleKick(ctx, barStart + beatSec * 2.75, 48, 0.36, 0.85);

      // Tight R&B Rim/Clap on 2 & 4
      scheduleSnare(ctx, barStart + beatSec, 0.14, 0.75, true);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.14, 0.75, true);

      // Silky 16th Shakers / Hats
      for (let s = 0; s < 16; s++) {
        const swing = s % 2 === 1 ? 0.03 : 0;
        scheduleHiHat(ctx, barStart + s * (beatSec / 4) + swing, false, 0.22);
      }

      // Warm Rhodes-style Lush Minor 9th Chords
      const chordProg =
        b % 2 === 0
          ? [174.61, 207.65, 261.63, 311.13, 392.0] // Fm9
          : [138.59, 174.61, 207.65, 261.63, 311.13]; // DbMaj9
      scheduleWarmPadChord(ctx, barStart, chordProg, barSec * 0.95, 0.36);

      // Deep Sine Sub Bass
      scheduleBass(ctx, barStart, b % 2 === 0 ? 43.65 : 34.65, beatSec * 3.6, 0.65, 'sine');

      // R&B Bell/Lead Melody in Drop
      if (isDrop) {
        scheduleSynthLead(ctx, barStart + beatSec * 1.25, 523.25, beatSec * 0.8, 0.2, 'sine');
        scheduleSynthLead(ctx, barStart + beatSec * 2.5, 622.25, beatSec * 1.1, 0.22, 'sine');
      }

    } else if (id === 'track_chopped') {
      // 76 BPM Houston Chopped & Screwed Slab Bounce
      scheduleKick(ctx, barStart, 40, 0.58, 1.15);
      scheduleKick(ctx, barStart + beatSec * 1.75, 38, 0.48, 0.95);
      scheduleKick(ctx, barStart + beatSec * 2.5, 40, 0.52, 1.05);

      // Heavy pitched-down snare on 2 and 4 (with chopped stutter on bar 4)
      scheduleSnare(ctx, barStart + beatSec, 0.24, 0.85, false);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.24, 0.85, false);
      if (b % 2 === 1) {
        scheduleSnare(ctx, barStart + beatSec * 3.5, 0.22, 0.78, false);
      }

      // Slowed trill hi-hats
      for (let s = 0; s < 16; s++) {
        scheduleHiHat(ctx, barStart + s * (beatSec / 4), false, 0.32);
      }

      // Deep Screwed Sub Bass
      scheduleBass(ctx, barStart, 36.71, beatSec * 2.2, 0.75, 'triangle');
      scheduleBass(ctx, barStart + beatSec * 2.5, 32.7, beatSec * 1.4, 0.72, 'triangle');

      // Chopped & Screwed Pitch-Bent Synth Chord
      scheduleWarmPadChord(ctx, barStart, [146.83, 174.61, 220.0, 261.63], beatSec * 3.5, 0.34);

    } else if (id === 'track_trap') {
      // 140 BPM Candy Paint 808 Rap Anthem
      scheduleKick(ctx, barStart, 44, 0.6, 1.2);
      if (b % 2 === 1) {
        scheduleKick(ctx, barStart + beatSec * 2.25, 42, 0.5, 1.0);
      }

      scheduleSnare(ctx, barStart + beatSec * 2, 0.2, 0.9, false);

      for (let s = 0; s < 16; s++) {
        const t = barStart + s * (beatSec / 4);
        scheduleHiHat(ctx, t, false, 0.35);
      }
      if (b % 4 === 3) {
        for (let r = 0; r < 8; r++) {
          scheduleHiHat(ctx, barStart + beatSec * 3 + r * (beatSec / 8), false, 0.3);
        }
      }

      scheduleBass(ctx, barStart, 36.7, beatSec * 3.5, 0.7, 'triangle');
      if (b % 2 === 1) {
        scheduleBass(ctx, barStart + beatSec * 2, 32.7, beatSec * 1.8, 0.7, 'triangle');
      }

      scheduleSynthLead(ctx, barStart, 261.63, beatSec * 1.5, 0.35, 'sawtooth');
      scheduleSynthLead(ctx, barStart + beatSec * 2, 311.13, beatSec * 1.5, 0.35, 'sawtooth');

    } else if (id === 'track_funk') {
      // 106 BPM Chrome Boulevard Talkbox Boogie
      for (let k = 0; k < 4; k++) {
        scheduleKick(ctx, barStart + k * beatSec, 56, 0.26, 0.95);
      }
      scheduleSnare(ctx, barStart + beatSec, 0.18, 0.8, true);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.18, 0.8, true);

      for (let h = 0; h < 4; h++) {
        scheduleHiHat(ctx, barStart + h * beatSec + beatSec * 0.5, true, 0.42);
      }

      const funkNotes = [110, 110, 130.81, 146.83, 110, 98.0];
      funkNotes.forEach((f, i) => {
        scheduleBass(ctx, barStart + i * (beatSec * 0.5), f, beatSec * 0.35, 0.58, 'sawtooth');
      });

      scheduleChord(ctx, barStart + beatSec * 0.5, [220, 261.63, 329.63], 0.18, 0.28);
      scheduleChord(ctx, barStart + beatSec * 2.5, [220, 261.63, 329.63], 0.18, 0.28);

    } else if (id === 'track_afro') {
      // 118 BPM Velvet Sunset Neo-Soul / Afro-R&B
      for (let k = 0; k < 4; k++) {
        scheduleKick(ctx, barStart + k * beatSec, 50, 0.3, 0.95);
      }
      for (let s = 0; s < 16; s++) {
        const vel = s % 3 === 0 ? 0.42 : 0.2;
        scheduleHiHat(ctx, barStart + s * (beatSec / 4), false, vel);
      }
      scheduleSnare(ctx, barStart + beatSec * 1.5, 0.08, 0.6, false);
      scheduleSnare(ctx, barStart + beatSec * 3.25, 0.08, 0.5, false);

      scheduleBass(ctx, barStart, 48.99, beatSec * 3.8, 0.62, 'sine');
      if (b % 2 === 1) {
        scheduleBass(ctx, barStart + beatSec * 2, 58.27, beatSec * 1.8, 0.62, 'sine');
      }

      scheduleSynthLead(ctx, barStart + beatSec * 0.75, 392.0, beatSec * 0.4, 0.28, 'sine');
      scheduleSynthLead(ctx, barStart + beatSec * 1.75, 466.16, beatSec * 0.4, 0.28, 'sine');
      scheduleSynthLead(ctx, barStart + beatSec * 2.75, 523.25, beatSec * 0.6, 0.28, 'sine');

    } else {
      // 102 BPM 2000s Club Rap / R&B Cypher Banger
      scheduleKick(ctx, barStart, 54, 0.32, 1.05);
      scheduleKick(ctx, barStart + beatSec * 0.75, 52, 0.25, 0.8);
      scheduleKick(ctx, barStart + beatSec * 2.5, 54, 0.32, 1.0);

      scheduleSnare(ctx, barStart + beatSec, 0.16, 0.85, true);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.16, 0.85, true);

      for (let s = 0; s < 8; s++) {
        scheduleHiHat(ctx, barStart + s * (beatSec * 0.5), s === 7, 0.38);
      }

      const bassSequence = [43.65, 43.65, 51.91, 58.27, 43.65, 38.89];
      for (let i = 0; i < 6; i++) {
        scheduleBass(ctx, barStart + i * (beatSec * 0.66), bassSequence[i], beatSec * 0.45, 0.65, 'sawtooth');
      }

      if (isDrop) {
        scheduleChord(ctx, barStart, [174.61, 207.65, 261.63], 0.22, 0.35);
        scheduleChord(ctx, barStart + beatSec * 1.5, [174.61, 207.65, 261.63], 0.22, 0.35);
        scheduleChord(ctx, barStart + beatSec * 2.75, [196.0, 233.08, 293.66], 0.22, 0.35);
      }
    }
  }
}

function scheduleWarmPadChord(
  ctx: OfflineAudioContext,
  time: number,
  freqs: number[],
  duration: number,
  gainVal: number
) {
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);

    gain.gain.setValueAtTime(0.005, time);
    gain.gain.linearRampToValueAtTime(gainVal / freqs.length, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  });
}

function scheduleKick(ctx: OfflineAudioContext, time: number, startFreq: number, duration: number, gainVal: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq * 2.8, time);
  osc.frequency.exponentialRampToValueAtTime(startFreq, time + 0.05);
  osc.frequency.exponentialRampToValueAtTime(25, time + duration);

  gain.gain.setValueAtTime(gainVal, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + duration);
}

function scheduleSnare(ctx: OfflineAudioContext, time: number, duration: number, gainVal: number, isClap: boolean) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = isClap ? 'bandpass' : 'highpass';
  filter.frequency.setValueAtTime(isClap ? 1400 : 1000, time);
  filter.Q.setValueAtTime(isClap ? 2.5 : 1.0, time);

  const gain = ctx.createGain();
  if (isClap) {
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.01);
    gain.gain.setValueAtTime(gainVal * 0.4, time + 0.02);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  } else {
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  }

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(time);
  noise.stop(time + duration);

  if (!isClap) {
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();
    tone.frequency.setValueAtTime(180, time);
    tone.frequency.exponentialRampToValueAtTime(80, time + 0.08);
    toneGain.gain.setValueAtTime(gainVal * 0.4, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    tone.connect(toneGain);
    toneGain.connect(ctx.destination);
    tone.start(time);
    tone.stop(time + 0.08);
  }
}

function scheduleHiHat(ctx: OfflineAudioContext, time: number, isOpen: boolean, gainVal: number) {
  const duration = isOpen ? 0.28 : 0.05;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(7500, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainVal, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(time);
  noise.stop(time + duration);
}

function scheduleBass(
  ctx: OfflineAudioContext,
  time: number,
  freq: number,
  duration: number,
  gainVal: number,
  type: OscillatorType = 'sawtooth'
) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * 4, time);
  filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + duration);
  filter.Q.setValueAtTime(4.0, time);

  gain.gain.setValueAtTime(gainVal, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + duration);
}

function scheduleSynthLead(
  ctx: OfflineAudioContext,
  time: number,
  freq: number,
  duration: number,
  gainVal: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(0.01, time);
  gain.gain.linearRampToValueAtTime(gainVal, time + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + duration);
}

function scheduleChord(
  ctx: OfflineAudioContext,
  time: number,
  freqs: number[],
  duration: number,
  gainVal: number
) {
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.2, time);
    filter.Q.setValueAtTime(2.0, time);

    gain.gain.setValueAtTime(gainVal / freqs.length, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  });
}

function extractWaveform(buffer: AudioBuffer, points: number): number[] {
  const rawData = buffer.getChannelData(0);
  const blockSize = Math.floor(rawData.length / points);
  const waveform: number[] = [];

  for (let i = 0; i < points; i++) {
    const blockStart = blockSize * i;
    let sum = 0;
    for (let j = 0; j < blockSize; j += 4) {
      sum += Math.abs(rawData[blockStart + j] || 0);
    }
    waveform.push(Math.min(1, (sum / (blockSize / 4)) * 2.2));
  }

  return waveform;
}

/**
 * Procedural Rap/R&B & Lowrider Streamer Soundboard Drop Generator
 * Supports real-time pitch multiplier (e.g. 0.75x Chopped to 1.35x Hype)
 */
export function playSoundboardDrop(
  audioCtx: AudioContext,
  destination: AudioNode,
  dropId: string,
  pitchMultiplier: number = 1.0
) {
  const now = audioCtx.currentTime;
  const p = Math.max(0.5, Math.min(1.75, pitchMultiplier));

  switch (dropId) {
    case 'airhorn': {
      const blasts = [0, 0.18, 0.36];
      blasts.forEach((delay) => {
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc2.type = 'square';

        osc.frequency.setValueAtTime(466.16 * p, now + delay);
        osc2.frequency.setValueAtTime(466.16 * 1.5 * p, now + delay);

        gain.gain.setValueAtTime(0.42, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.16);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.17);
        osc2.start(now + delay);
        osc2.stop(now + delay + 0.17);
      });
      break;
    }

    case 'lowrider_horn': {
      // Vintage Impala / Cadillac Dual Klaxon Horn
      const oscA = audioCtx.createOscillator();
      const oscB = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      oscA.type = 'triangle';
      oscB.type = 'sawtooth';

      oscA.frequency.setValueAtTime(311.13 * p, now);
      oscB.frequency.setValueAtTime(369.99 * p, now);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      oscA.connect(gain);
      oscB.connect(gain);
      gain.connect(destination);

      oscA.start(now);
      oscA.stop(now + 0.7);
      oscB.start(now);
      oscB.stop(now + 0.7);
      break;
    }

    case 'hydraulic_pop': {
      // Lowrider Hydraulic Pump Switch Clank + Pneumatic Air Release (Pssshhh!)
      const clank = audioCtx.createOscillator();
      const clankGain = audioCtx.createGain();
      clank.type = 'square';
      clank.frequency.setValueAtTime(920 * p, now);
      clank.frequency.exponentialRampToValueAtTime(140 * p, now + 0.08);
      clankGain.gain.setValueAtTime(0.65, now);
      clankGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      clank.connect(clankGain);
      clankGain.connect(destination);
      clank.start(now);
      clank.stop(now + 0.1);

      // Pneumatic air hiss
      const bufSize = Math.floor(audioCtx.sampleRate * 0.45);
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = buf;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4200 * p, now + 0.05);
      filter.Q.setValueAtTime(1.8, now + 0.05);
      const nGain = audioCtx.createGain();
      nGain.gain.setValueAtTime(0.55, now + 0.05);
      nGain.gain.exponentialRampToValueAtTime(0.008, now + 0.48);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(destination);
      noise.start(now + 0.05);
      noise.stop(now + 0.5);
      break;
    }

    case 'sub_boom': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(115 * p, now);
      osc.frequency.exponentialRampToValueAtTime(26 * p, now + 1.25);

      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 1.35);
      break;
    }

    case 'rewind': {
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.65);
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i / 15);
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3600 * p, now);
      filter.frequency.exponentialRampToValueAtTime(180 * p, now + 0.6);
      filter.Q.setValueAtTime(8, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(now);
      noise.stop(now + 0.65);
      break;
    }

    case 'money_cash': {
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1975.53 * p, now);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      setTimeout(() => {
        for (let c = 0; c < 4; c++) {
          const t = audioCtx.currentTime + c * 0.05;
          const coinOsc = audioCtx.createOscillator();
          const coinGain = audioCtx.createGain();
          coinOsc.type = 'sine';
          coinOsc.frequency.setValueAtTime((2500 + c * 400) * p, t);
          coinGain.gain.setValueAtTime(0.32, t);
          coinGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
          coinOsc.connect(coinGain);
          coinGain.connect(destination);
          coinOsc.start(t);
          coinOsc.stop(t + 0.12);
        }
      }, 70);
      break;
    }

    case 'scratch_chirp': {
      const times = [0, 0.12];
      times.forEach((offset, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        const startFreq = (idx === 0 ? 300 : 1200) * p;
        const endFreq = (idx === 0 ? 1200 : 350) * p;
        osc.frequency.setValueAtTime(startFreq, now + offset);
        osc.frequency.linearRampToValueAtTime(endFreq, now + offset + 0.08);

        gain.gain.setValueAtTime(0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.09);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
      break;
    }

    case 'chimes_sweep': {
      // 90s Slow Jam Sparkling Wind Chimes Sweep
      for (let i = 0; i < 8; i++) {
        const delay = i * 0.055;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime((1400 + i * 320) * p, now + delay);
        gain.gain.setValueAtTime(0.22, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.005, now + delay + 0.55);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.56);
      }
      break;
    }

    case 'westcoast_whistle': {
      // Iconic G-Funk High Sine Glissando Whistle
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33 * p, now); // D5
      osc.frequency.linearRampToValueAtTime(880 * p, now + 0.18); // A5
      osc.frequency.linearRampToValueAtTime(783.99 * p, now + 0.45); // G5
      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.68);
      break;
    }

    case 'chopped_slowdown': {
      // Houston Screw Tape Power-Down Drop
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220 * p, now);
      osc.frequency.exponentialRampToValueAtTime(32 * p, now + 0.75);
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.78);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    }

    case 'laser': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400 * p, now);
      osc.frequency.exponentialRampToValueAtTime(80 * p, now + 0.28);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }

    case 'siren': {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650 * p, now);
      osc.frequency.linearRampToValueAtTime(1100 * p, now + 0.35);
      osc.frequency.linearRampToValueAtTime(650 * p, now + 0.7);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    }

    case 'damn_vocal': {
      const osc = audioCtx.createOscillator();
      const f1 = audioCtx.createBiquadFilter();
      const f2 = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130 * p, now);
      osc.frequency.exponentialRampToValueAtTime(85 * p, now + 0.45);

      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(700 * p, now);
      f1.frequency.linearRampToValueAtTime(450 * p, now + 0.45);
      f1.Q.setValueAtTime(5, now);

      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(1200 * p, now);
      f2.frequency.linearRampToValueAtTime(800 * p, now + 0.45);
      f2.Q.setValueAtTime(5, now);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 0.52);
      break;
    }

    case 'censor_bleep': {
      // Standard Broadcast 1000Hz Censor Bleep for Clean Live Streams
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.45);
      break;
    }

    default:
      break;
  }
}
