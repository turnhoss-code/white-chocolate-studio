/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Procedural Track Synthesizer & Soundboard Generator
 */

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
 * Procedurally generates rich, multi-layered DJ tracks using OfflineAudioContext.
 * Renders in milliseconds with professional kicks, basses, chords, and percussion.
 */
export async function generateProceduralTrack(
  id: string,
  sampleRate: number = 44100
): Promise<{ buffer: AudioBuffer; metadata: TrackMetadata; waveform: number[] }> {
  let bpm = 126;
  let title = 'TikTok Club Heat';
  let artist = 'White Chocolate';
  let genre = 'Club / Tech House';
  let key = 'F minor';
  let color = '#ef4444';
  let durationBars = 32;

  if (id === 'track_lowrider') {
    bpm = 94;
    title = 'Lowrider West Coast Bounce';
    artist = 'White Chocolate & DJ Chrome';
    genre = 'West Coast G-Funk';
    key = 'D minor';
    color = '#f59e0b';
    durationBars = 32;
  } else if (id === 'track_trap') {
    bpm = 140;
    title = 'Midnight 808 Trap Anthem';
    artist = 'White Chocolate';
    genre = 'Trap / 808 Hype';
    key = 'C minor';
    color = '#8b5cf6';
    durationBars = 32;
  } else if (id === 'track_funk') {
    bpm = 112;
    title = 'Chrome Boulevard Funk';
    artist = 'White Chocolate Studio';
    genre = 'Electro Funk';
    key = 'A minor';
    color = '#10b981';
    durationBars = 32;
  } else if (id === 'track_afro') {
    bpm = 122;
    title = 'Hypnotic Afro-House';
    artist = 'DJ White Chocolate';
    genre = 'Deep Afro-House';
    key = 'G minor';
    color = '#ec4899';
    durationBars = 32;
  }

  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;
  const totalDuration = durationBars * barSec;
  const totalSamples = Math.ceil(sampleRate * totalDuration);

  // Render stereo audio buffer offline
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  // Build rhythm and stems based on track style
  buildArrangement(offlineCtx, id, bpm, durationBars, beatSec);

  const renderedBuffer = await offlineCtx.startRendering();

  // Extract normalized waveform peaks for visualizer (e.g. 150 points)
  const waveform = extractWaveform(renderedBuffer, 160);

  const metadata: TrackMetadata = {
    id,
    title,
    artist,
    bpm,
    duration: totalDuration,
    genre,
    key,
    color,
    coverImage: '/assets/aistudio/white_chocolate_studio_ce8a694c.JPG',
    buffer: renderedBuffer,
    waveformData: waveform
  };

  return { buffer: renderedBuffer, metadata, waveform };
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
    const isIntro = b < 4;
    const isBuild = (b >= 12 && b < 16) || (b >= 28 && b < 32);
    const isDrop = (b >= 4 && b < 12) || (b >= 16 && b < 28);

    if (id === 'track_lowrider') {
      // 94 BPM West Coast G-Funk
      // Kick on 1 and 3.5
      scheduleKick(ctx, barStart, 55, 0.35, 1.0);
      scheduleKick(ctx, barStart + beatSec * 2.5, 52, 0.28, 0.85);

      // Crisp Claps / Snares on 2 and 4
      scheduleSnare(ctx, barStart + beatSec, 0.15, 0.8, true);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.15, 0.8, true);

      // Swung 16th Hi-hats
      for (let s = 0; s < 16; s++) {
        const swing = s % 2 === 1 ? 0.025 : 0;
        const time = barStart + s * (beatSec / 4) + swing;
        const vel = s % 4 === 0 ? 0.6 : s % 2 === 0 ? 0.4 : 0.25;
        scheduleHiHat(ctx, time, false, vel * 0.7);
      }

      // West Coast Whistle / Sine Lead in Drop
      if (isDrop && b % 2 === 0) {
        scheduleSynthLead(ctx, barStart + beatSec * 0.5, 587.33, beatSec * 3, 0.25, 'sine'); // D5
        scheduleSynthLead(ctx, barStart + beatSec * 4, 659.25, beatSec * 2.5, 0.25, 'sine'); // E5
      }

      // Funky Lowrider Bassline (D minor)
      const bassNotes = [73.42, 73.42, 82.41, 98.0, 73.42, 65.41]; // D2, D2, E2, G2, D2, C2
      bassNotes.forEach((freq, idx) => {
        scheduleBass(ctx, barStart + idx * (beatSec * 0.66), freq, beatSec * 0.5, 0.5, 'sawtooth');
      });

    } else if (id === 'track_trap') {
      // 140 BPM Trap Anthem
      // Heavy 808 Kick
      scheduleKick(ctx, barStart, 44, 0.6, 1.2);
      if (b % 2 === 1) {
        scheduleKick(ctx, barStart + beatSec * 2.25, 42, 0.5, 1.0);
      }

      // Snare on beat 3 (Half-time trap feel)
      scheduleSnare(ctx, barStart + beatSec * 2, 0.2, 0.9, false);

      // Rapid rolling Trap Hi-Hats
      for (let s = 0; s < 16; s++) {
        const t = barStart + s * (beatSec / 4);
        scheduleHiHat(ctx, t, false, 0.35);
      }
      // Occasional 32nd triplet trap rolls
      if (b % 4 === 3) {
        for (let r = 0; r < 8; r++) {
          scheduleHiHat(ctx, barStart + beatSec * 3 + r * (beatSec / 8), false, 0.3);
        }
      }

      // 808 Glide Bass
      scheduleBass(ctx, barStart, 36.7, beatSec * 3.5, 0.7, 'triangle'); // D1
      if (b % 2 === 1) {
        scheduleBass(ctx, barStart + beatSec * 2, 32.7, beatSec * 1.8, 0.7, 'triangle'); // C1
      }

      // Dark Trap Brass / Synth Pluck
      scheduleSynthLead(ctx, barStart, 261.63, beatSec * 1.5, 0.35, 'sawtooth'); // C4
      scheduleSynthLead(ctx, barStart + beatSec * 2, 311.13, beatSec * 1.5, 0.35, 'sawtooth'); // Eb4

    } else if (id === 'track_funk') {
      // 112 BPM Chrome Boulevard Funk
      // Four on floor kick with disco funk snare
      for (let k = 0; k < 4; k++) {
        scheduleKick(ctx, barStart + k * beatSec, 60, 0.25, 0.9);
      }
      scheduleSnare(ctx, barStart + beatSec, 0.18, 0.75, true);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.18, 0.75, true);

      // Open hat on the offbeat
      for (let h = 0; h < 4; h++) {
        scheduleHiHat(ctx, barStart + h * beatSec + beatSec * 0.5, true, 0.45);
      }

      // Slap Bassline
      const funkNotes = [110, 110, 130.81, 146.83, 110, 98.0];
      funkNotes.forEach((f, i) => {
        scheduleBass(ctx, barStart + i * (beatSec * 0.5), f, beatSec * 0.35, 0.55, 'sawtooth');
      });

      // Funky Clav / Guitar Chop
      scheduleChord(ctx, barStart + beatSec * 0.5, [220, 261.63, 329.63], 0.15, 0.25); // Am
      scheduleChord(ctx, barStart + beatSec * 2.5, [220, 261.63, 329.63], 0.15, 0.25);

    } else if (id === 'track_afro') {
      // 122 BPM Hypnotic Afro-House
      // Deep punch kick
      for (let k = 0; k < 4; k++) {
        scheduleKick(ctx, barStart + k * beatSec, 50, 0.3, 0.95);
      }
      // Polyrhythmic shakers
      for (let s = 0; s < 16; s++) {
        const vel = (s % 3 === 0) ? 0.45 : 0.2;
        scheduleHiHat(ctx, barStart + s * (beatSec / 4), false, vel);
      }
      // Rimshot / Woodblock
      scheduleSnare(ctx, barStart + beatSec * 1.5, 0.08, 0.6, false);
      scheduleSnare(ctx, barStart + beatSec * 3.25, 0.08, 0.5, false);

      // Warm Deep Sub Bass
      scheduleBass(ctx, barStart, 48.99, beatSec * 3.8, 0.6, 'sine'); // G1
      if (b % 2 === 1) {
        scheduleBass(ctx, barStart + beatSec * 2, 58.27, beatSec * 1.8, 0.6, 'sine'); // Bb1
      }

      // Kalimba / Marimba melodic hook
      scheduleSynthLead(ctx, barStart + beatSec * 0.75, 392.0, beatSec * 0.4, 0.3, 'sine'); // G4
      scheduleSynthLead(ctx, barStart + beatSec * 1.75, 466.16, beatSec * 0.4, 0.3, 'sine'); // Bb4
      scheduleSynthLead(ctx, barStart + beatSec * 2.75, 523.25, beatSec * 0.6, 0.3, 'sine'); // C5

    } else {
      // Default: 126 BPM TikTok Club Heat (Tech House Banger)
      // Four on the floor kick
      for (let k = 0; k < 4; k++) {
        scheduleKick(ctx, barStart + k * beatSec, 58, 0.26, 1.05);
      }
      // Claps on 2 and 4
      scheduleSnare(ctx, barStart + beatSec, 0.16, 0.8, true);
      scheduleSnare(ctx, barStart + beatSec * 3, 0.16, 0.8, true);

      // Offbeat Tech-House Open Hi-hat
      for (let o = 0; o < 4; o++) {
        scheduleHiHat(ctx, barStart + o * beatSec + beatSec * 0.5, true, 0.5);
      }

      // Rolling 16th sub bassline (F minor)
      const bassSequence = [43.65, 43.65, 43.65, 51.91, 43.65, 43.65, 58.27, 43.65];
      for (let i = 0; i < 8; i++) {
        scheduleBass(ctx, barStart + i * (beatSec * 0.5), bassSequence[i], beatSec * 0.4, 0.65, 'sawtooth');
      }

      // Catchy Club Stabs in Drop
      if (isDrop) {
        scheduleChord(ctx, barStart + beatSec * 0.75, [174.61, 207.65, 261.63], 0.2, 0.35); // Fm
        scheduleChord(ctx, barStart + beatSec * 2.75, [196.0, 233.08, 293.66], 0.2, 0.35); // Gm
      }
    }
  }
}

// Kick drum synthesis
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

// Snare and Clap synthesis with noise and body
function scheduleSnare(ctx: OfflineAudioContext, time: number, duration: number, gainVal: number, isClap: boolean) {
  // Noise buffer for snap
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
    // Multi-tap attack for clap feel
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

  // Snare tone body
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

// Hi-Hat synthesis
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

// Bass synth
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

// Lead melody synth
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

// Chord stab
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
 * Procedural TikTok Streamer Soundboard Drop Generator
 */
export function playSoundboardDrop(
  audioCtx: AudioContext,
  destination: AudioNode,
  dropId: string
) {
  const now = audioCtx.currentTime;

  switch (dropId) {
    case 'airhorn': {
      // Classic DJ Reggae 3-blast Airhorn
      const blasts = [0, 0.18, 0.36];
      blasts.forEach((delay) => {
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc2.type = 'square';

        osc.frequency.setValueAtTime(466.16, now + delay); // Bb4
        osc2.frequency.setValueAtTime(466.16 * 1.5, now + delay); // F5

        gain.gain.setValueAtTime(0.4, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.15);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
        osc2.start(now + delay);
        osc2.stop(now + delay + 0.16);
      });
      break;
    }

    case 'lowrider_horn': {
      // Lowrider dual klaxon horn
      const oscA = audioCtx.createOscillator();
      const oscB = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      oscA.type = 'triangle';
      oscB.type = 'sawtooth';

      oscA.frequency.setValueAtTime(311.13, now); // Eb4
      oscB.frequency.setValueAtTime(369.99, now); // F#4

      gain.gain.setValueAtTime(0.45, now);
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

    case 'sub_boom': {
      // 808 Sub Boom / Bass Drop
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 1.2);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 1.3);
      break;
    }

    case 'rewind': {
      // Vinyl Backspin / Tape Stop Rewind
      const bufferSize = audioCtx.sampleRate * 0.6;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i / 15);
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3500, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.55);
      filter.Q.setValueAtTime(8, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(now);
      noise.stop(now + 0.6);
      break;
    }

    case 'money_cash': {
      // Cash register ding-ching ($$ Tongue Homage)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1975.53, now); // B6
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Ching Coins
      setTimeout(() => {
        for (let c = 0; c < 4; c++) {
          const t = audioCtx.currentTime + c * 0.05;
          const coinOsc = audioCtx.createOscillator();
          const coinGain = audioCtx.createGain();
          coinOsc.type = 'sine';
          coinOsc.frequency.setValueAtTime(2500 + c * 400, t);
          coinGain.gain.setValueAtTime(0.3, t);
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
      // Fast Double Chirp Scratch
      const times = [0, 0.12];
      times.forEach((offset, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        const startFreq = idx === 0 ? 300 : 1200;
        const endFreq = idx === 0 ? 1200 : 350;
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

    case 'laser': {
      // Dub Laser
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }

    case 'siren': {
      // DJ Alarm Siren
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.linearRampToValueAtTime(1100, now + 0.35);
      osc.frequency.linearRampToValueAtTime(650, now + 0.7);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    }

    case 'damn_vocal': {
      // Synthesized formant vocal hype drop ("DAMN!")
      const osc = audioCtx.createOscillator();
      const f1 = audioCtx.createBiquadFilter();
      const f2 = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.45);

      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(700, now);
      f1.frequency.linearRampToValueAtTime(450, now + 0.45);
      f1.Q.setValueAtTime(5, now);

      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(1200, now);
      f2.frequency.linearRampToValueAtTime(800, now + 0.45);
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

    case 'vine_boom': {
      // Vine Boom: Sub drop + distorted punch + reverb boom
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const dist = audioCtx.createWaveShaper();

      // Soft clip curve
      const n = 256;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; ++i) {
        const x = (i * 2) / n - 1;
        curve[i] = (Math.PI + 4) * x / (Math.PI + 4 * Math.abs(x));
      }
      dist.curve = curve;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.9);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      osc.connect(dist);
      dist.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 1.2);
      break;
    }

    case 'bruh': {
      // "Bruh" vocal formant sound effect
      const osc = audioCtx.createOscillator();
      const f1 = audioCtx.createBiquadFilter();
      const f2 = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      // Pitch drop 135Hz -> 90Hz
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.42);

      // Formants for /ʊ/ to /ʌ/
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(450, now);
      f1.frequency.linearRampToValueAtTime(320, now + 0.4);
      f1.Q.setValueAtTime(6, now);

      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(1050, now);
      f2.frequency.linearRampToValueAtTime(800, now + 0.4);
      f2.Q.setValueAtTime(6, now);

      gain.gain.setValueAtTime(0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 0.48);
      break;
    }

    case 'emotional_damage': {
      // Dramatic cinematic brass stab chord
      const freqs = [174.61, 220.0, 261.63, 349.23, 440.0]; // F minor / major cinematic punch
      freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4200, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.7);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        osc.start(now);
        osc.stop(now + 0.9);
      });
      break;
    }

    case 'oh_no': {
      // TikTok "Oh No No No" laughing ascending chromatic notes
      const notes = [440, 466.16, 493.88, 523.25, 587.33, 659.25];
      notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.09;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, noteStart + 0.08);

        gain.gain.setValueAtTime(0.45, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.085);

        osc.connect(gain);
        gain.connect(destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.09);
      });
      break;
    }

    case 'ding_levelup': {
      // Sparkling video game / TikTok chime
      const bellPitches = [880, 1318.5, 1760, 2637];
      bellPitches.forEach((freq, idx) => {
        const t = now + idx * 0.06;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.38, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.55);

        osc.connect(gain);
        gain.connect(destination);
        osc.start(t);
        osc.stop(t + 0.6);
      });
      break;
    }

    case 'crowd_cheer': {
      // Stadium hype cheer / applause burst
      const dur = 1.6;
      const bufferSize = audioCtx.sampleRate * dur;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i / 120);
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.setValueAtTime(1.8, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      noise.start(now);
      noise.stop(now + dur + 0.1);
      break;
    }

    case 'rizz_horn': {
      // Dramatic slow seductive horn riff
      const riff = [
        { f: 293.66, d: 0.18 }, // D4
        { f: 349.23, d: 0.22 }, // F4
        { f: 440.0, d: 0.25 },  // A4
        { f: 415.3, d: 0.55 }   // Ab4 (Dramatic tension)
      ];
      let offset = 0;
      riff.forEach((note) => {
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.f, now + offset);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now + offset);
        filter.Q.setValueAtTime(3, now + offset);

        gain.gain.setValueAtTime(0.4, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + note.d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        osc.start(now + offset);
        osc.stop(now + offset + note.d + 0.02);
        offset += note.d * 0.9;
      });
      break;
    }

    case 'sheesh': {
      // High pitch vocal whistle "Sheeeesh"
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(2800, now + 0.3);
      osc.frequency.linearRampToValueAtTime(2600, now + 0.6);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.7);
      break;
    }

    case 'fart_reverb': {
      // Bass boosted meme fart / boom
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.linearRampToValueAtTime(45, now + 0.5);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.9);
      break;
    }

    case 'sad_violin': {
      // Sad violin dramatic meme tone
      const osc = audioCtx.createOscillator();
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.linearRampToValueAtTime(415.3, now + 0.7); // Ab4

      // Vibrato LFO
      lfo.frequency.setValueAtTime(5.5, now);
      lfoGain.gain.setValueAtTime(12, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

      osc.connect(gain);
      gain.connect(destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 1.2);
      osc.stop(now + 1.2);
      break;
    }

    case 'record_scratch_freeze': {
      // Dramatic DJ freeze scratch halt
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.38);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + 0.42);
      break;
    }

    default:
      break;
  }
}
