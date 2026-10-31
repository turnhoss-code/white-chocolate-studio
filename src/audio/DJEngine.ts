/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Core DJ Audio Engine
 */

import { TrackMetadata, playSoundboardDrop } from './proceduralTracks';

export type CrossfaderCurve = 'smooth' | 'cut' | 'linear';
export type MicVoiceEffect = 'clean' | 'radio' | 'robot' | 'reverb';

export interface DeckState {
  id: 'A' | 'B';
  track: TrackMetadata | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  tempo: number; // -16% to +16% (e.g. 0 = 1.0x, 0.08 = 1.08x)
  effectiveBpm: number;
  isCuePressed: boolean;
  cuePoint: number;
  hotCues: (number | null)[];
  loop: {
    active: boolean;
    lengthBeats: number;
    startTime: number;
  };
  filter: number; // -100 (LPF) to 0 (bypass) to +100 (HPF)
  eq: {
    high: number; // -24 to +6 dB
    mid: number;
    low: number;
    killHigh: boolean;
    killMid: boolean;
    killLow: boolean;
  };
  fx: {
    echo: boolean;
    stutter: boolean;
    flanger: boolean;
    distortion: boolean;
    reverb: boolean;
  };
  isScratching: boolean;
  rotationAngle: number;
}

export class DJEngine {
  public ctx: AudioContext | null = null;

  // Master bus nodes
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  public masterAnalyser: AnalyserNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  // Recorder
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording = false;
  public recordingStartTime = 0;

  // Crossfader
  public crossfader = 0; // -1 (Deck A) to 0 (Center) to 1 (Deck B)
  public crossfaderCurve: CrossfaderCurve = 'smooth';
  private crossfaderGainA: GainNode | null = null;
  private crossfaderGainB: GainNode | null = null;

  // Mic
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private micFilter: BiquadFilterNode | null = null;
  public micActive = false;
  public micTalkoverDucking = true;
  public micEffect: MicVoiceEffect = 'clean';
  public micVolume = 0.8;

  // Soundboard Bus
  private soundboardGain: GainNode | null = null;

  // Deck Audio Nodes
  private deckNodes: {
    A: DeckAudioNodes;
    B: DeckAudioNodes;
  } | null = null;

  // Callback listeners for UI reactivity
  private onStateChange: (() => void) | null = null;

  // Decks public state
  public deckAState: DeckState = {
    id: 'A',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    tempo: 0,
    effectiveBpm: 126,
    isCuePressed: false,
    cuePoint: 0,
    hotCues: [null, null, null, null],
    loop: { active: false, lengthBeats: 4, startTime: 0 },
    filter: 0,
    eq: { high: 0, mid: 0, low: 0, killHigh: false, killMid: false, killLow: false },
    fx: { echo: false, stutter: false, flanger: false, distortion: false, reverb: false },
    isScratching: false,
    rotationAngle: 0
  };

  public deckBState: DeckState = {
    id: 'B',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    tempo: 0,
    effectiveBpm: 94,
    isCuePressed: false,
    cuePoint: 0,
    hotCues: [null, null, null, null],
    loop: { active: false, lengthBeats: 4, startTime: 0 },
    filter: 0,
    eq: { high: 0, mid: 0, low: 0, killHigh: false, killMid: false, killLow: false },
    fx: { echo: false, stutter: false, flanger: false, distortion: false, reverb: false },
    isScratching: false,
    rotationAngle: 0
  };

  // Animation frame loop for playback time and vinyl rotation
  private animFrameId: number | null = null;
  private lastTimestamp = 0;

  constructor() {
    // Lazy initialize on first interaction
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master limiting & gain
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(3.0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20.0, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.1, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.95, this.ctx.currentTime);

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    this.streamDestination = this.ctx.createMediaStreamDestination();

    // Connect Master graph
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
    this.masterAnalyser.connect(this.streamDestination);

    // Crossfader Gainer Nodes
    this.crossfaderGainA = this.ctx.createGain();
    this.crossfaderGainB = this.ctx.createGain();
    this.crossfaderGainA.connect(this.masterGain);
    this.crossfaderGainB.connect(this.masterGain);

    // Soundboard Bus
    this.soundboardGain = this.ctx.createGain();
    this.soundboardGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.soundboardGain.connect(this.masterGain);

    // Build Deck DSP chains
    this.deckNodes = {
      A: this.createDeckChain('A', this.crossfaderGainA),
      B: this.createDeckChain('B', this.crossfaderGainB)
    };

    this.updateCrossfader(this.crossfader);

    // Start UI update tick
    this.startEngineLoop();
  }

  private createDeckChain(deckId: 'A' | 'B', destination: GainNode): DeckAudioNodes {
    if (!this.ctx) throw new Error('AudioContext missing');
    const ctx = this.ctx;

    // Deck Gain
    const deckGain = ctx.createGain();
    deckGain.gain.setValueAtTime(0.85, ctx.currentTime);

    // 3-Band EQ
    const lowEQ = ctx.createBiquadFilter();
    lowEQ.type = 'lowshelf';
    lowEQ.frequency.setValueAtTime(280, ctx.currentTime);

    const midEQ = ctx.createBiquadFilter();
    midEQ.type = 'peaking';
    midEQ.frequency.setValueAtTime(1000, ctx.currentTime);
    midEQ.Q.setValueAtTime(1.0, ctx.currentTime);

    const highEQ = ctx.createBiquadFilter();
    highEQ.type = 'highshelf';
    highEQ.frequency.setValueAtTime(3200, ctx.currentTime);

    // Resonant Filter Sweep (Neutral / LPF / HPF)
    const filter = ctx.createBiquadFilter();
    filter.type = 'allpass'; // Neutral initial
    filter.frequency.setValueAtTime(20000, ctx.currentTime);

    // FX Nodes: Echo Delay
    const echoDelay = ctx.createDelay();
    echoDelay.delayTime.setValueAtTime(0.24, ctx.currentTime);
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.setValueAtTime(0.45, ctx.currentTime);
    const echoWet = ctx.createGain();
    echoWet.gain.setValueAtTime(0, ctx.currentTime);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoDelay.connect(echoWet);

    // FX Nodes: Flanger
    const flangerDelay = ctx.createDelay();
    flangerDelay.delayTime.setValueAtTime(0.003, ctx.currentTime);
    const flangerOsc = ctx.createOscillator();
    const flangerOscGain = ctx.createGain();
    flangerOsc.type = 'sine';
    flangerOsc.frequency.setValueAtTime(0.4, ctx.currentTime);
    flangerOscGain.gain.setValueAtTime(0.002, ctx.currentTime);
    flangerOsc.connect(flangerOscGain);
    flangerOscGain.connect(flangerDelay.delayTime);
    flangerOsc.start();
    const flangerWet = ctx.createGain();
    flangerWet.gain.setValueAtTime(0, ctx.currentTime);
    flangerDelay.connect(flangerWet);

    // FX Nodes: Distortion / Waveshaper
    const distortionNode = ctx.createWaveShaper();
    distortionNode.curve = this.makeDistortionCurve(30);
    distortionNode.oversample = '4x';
    const distWet = ctx.createGain();
    distWet.gain.setValueAtTime(0, ctx.currentTime);
    distortionNode.connect(distWet);

    // FX Nodes: Algorithmic Reverb
    const reverbNode = ctx.createConvolver();
    reverbNode.buffer = this.createSyntheticImpulseResponse(ctx, 2.2, 2.0);
    const reverbWet = ctx.createGain();
    reverbWet.gain.setValueAtTime(0, ctx.currentTime);
    reverbNode.connect(reverbWet);

    // Deck Analyser
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;

    // Connect Chain
    // Input Source -> LowEQ -> MidEQ -> HighEQ -> Filter -> FX Bus -> deckGain -> destination
    lowEQ.connect(midEQ);
    midEQ.connect(highEQ);
    highEQ.connect(filter);

    // Dry path
    filter.connect(deckGain);

    // Wet FX paths
    filter.connect(echoDelay);
    echoWet.connect(deckGain);

    filter.connect(flangerDelay);
    flangerWet.connect(deckGain);

    filter.connect(distortionNode);
    distWet.connect(deckGain);

    filter.connect(reverbNode);
    reverbWet.connect(deckGain);

    deckGain.connect(analyser);
    analyser.connect(destination);

    return {
      inputNode: lowEQ,
      lowEQ,
      midEQ,
      highEQ,
      filter,
      echoDelay,
      echoWet,
      flangerWet,
      distWet,
      reverbWet,
      deckGain,
      analyser,
      activeSource: null,
      sourceStartedAt: 0,
      bufferOffset: 0
    };
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = amount;
    const n_samples = 44100;
    const buffer = new ArrayBuffer(n_samples * 4);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createSyntheticImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const length = ctx.sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
  }

  public registerStateListener(cb: () => void) {
    this.onStateChange = cb;
  }

  public loadTrack(deckId: 'A' | 'B', track: TrackMetadata) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    this.stopDeck(deckId);

    state.track = track;
    state.duration = track.duration;
    state.currentTime = 0;
    state.cuePoint = 0;
    state.hotCues = [0, null, null, null];
    state.tempo = 0;
    state.effectiveBpm = track.bpm;
    state.isPlaying = false;
    state.isCuePressed = false;
    state.loop = { active: false, lengthBeats: 4, startTime: 0 };

    this.notifyState();
  }

  public playPauseDeck(deckId: 'A' | 'B') {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    if (!state.track || !state.track.buffer) return;

    if (state.isPlaying) {
      this.pauseDeck(deckId);
    } else {
      this.playDeck(deckId);
    }
  }

  public playDeck(deckId: 'A' | 'B') {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!state.track?.buffer || !nodes || !this.ctx) return;

    if (state.isPlaying) return;

    // Build fresh AudioBufferSourceNode
    this.startBufferSource(deckId, state.currentTime);
    state.isPlaying = true;
    this.notifyState();
  }

  public pauseDeck(deckId: 'A' | 'B') {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes || !this.ctx || !state.isPlaying) return;

    if (nodes.activeSource) {
      try {
        nodes.activeSource.stop();
        nodes.activeSource.disconnect();
      } catch {
        // ignore if already stopped
      }
      nodes.activeSource = null;
    }

    state.isPlaying = false;
    this.notifyState();
  }

  public stopDeck(deckId: 'A' | 'B') {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    this.pauseDeck(deckId);
    state.currentTime = 0;
    this.notifyState();
  }

  public triggerCue(deckId: 'A' | 'B', pressed: boolean) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    if (!state.track?.buffer) return;

    state.isCuePressed = pressed;

    if (pressed) {
      if (state.isPlaying) {
        // Pause and jump to cue point
        this.pauseDeck(deckId);
        state.currentTime = state.cuePoint;
      } else {
        // Momentary play from cue point
        this.startBufferSource(deckId, state.cuePoint);
        state.isPlaying = true;
      }
    } else {
      // Releasing cue button while holding stops and rewinds to cue
      if (!state.isPlaying) return;
      this.pauseDeck(deckId);
      state.currentTime = state.cuePoint;
    }
    this.notifyState();
  }

  public setCuePoint(deckId: 'A' | 'B') {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    state.cuePoint = state.currentTime;
    this.notifyState();
  }

  public triggerHotCue(deckId: 'A' | 'B', index: number) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    if (!state.track?.buffer) return;

    if (state.hotCues[index] === null) {
      // Set hot cue
      state.hotCues[index] = state.currentTime;
    } else {
      // Jump and play
      state.currentTime = state.hotCues[index]!;
      if (state.isPlaying) {
        this.startBufferSource(deckId, state.currentTime);
      } else {
        this.playDeck(deckId);
      }
    }
    this.notifyState();
  }

  public deleteHotCue(deckId: 'A' | 'B', index: number) {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    state.hotCues[index] = null;
    this.notifyState();
  }

  public toggleLoop(deckId: 'A' | 'B', lengthBeats?: number) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    if (!state.track) return;

    if (lengthBeats !== undefined) {
      state.loop.lengthBeats = lengthBeats;
    }

    state.loop.active = !state.loop.active;
    if (state.loop.active) {
      state.loop.startTime = state.currentTime;
    }
    this.notifyState();
  }

  public setLoopLength(deckId: 'A' | 'B', lengthBeats: number) {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    state.loop.lengthBeats = lengthBeats;
    this.notifyState();
  }

  public setTempo(deckId: 'A' | 'B', tempoPercent: number, allowWide = false) {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const limit = allowWide ? 0.60 : 0.50;
    state.tempo = Math.max(-limit, Math.min(limit, tempoPercent));
    if (state.track) {
      state.effectiveBpm = Number((state.track.bpm * (1 + state.tempo)).toFixed(1));
    }
    this.updatePlaybackRate(deckId);
    this.notifyState();
  }

  public nudgePitch(deckId: 'A' | 'B', direction: 'plus' | 'minus') {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nudgeAmount = direction === 'plus' ? 0.04 : -0.04;
    const originalTempo = state.tempo;

    this.setTempo(deckId, originalTempo + nudgeAmount);
    setTimeout(() => {
      this.setTempo(deckId, originalTempo);
    }, 250);
  }

  /**
   * Automatically adjusts the playback speed of the non-playing deck to match the BPM of the active deck,
   * ensuring seamless transitions.
   */
  public syncDeck(clickedDeckId: 'A' | 'B'): { syncedDeck: 'A' | 'B'; targetBpm: number } | null {
    this.init();
    const deckA = this.deckAState;
    const deckB = this.deckBState;

    if (!deckA.track || !deckB.track) return null;

    let targetDeckId: 'A' | 'B';
    let sourceDeckId: 'A' | 'B';

    if (deckA.isPlaying && !deckB.isPlaying) {
      // Active deck is A, non-playing deck is B
      // Automatically adjust non-playing deck (B) to match active deck (A)
      sourceDeckId = 'A';
      targetDeckId = 'B';
    } else if (deckB.isPlaying && !deckA.isPlaying) {
      // Active deck is B, non-playing deck is A
      // Automatically adjust non-playing deck (A) to match active deck (B)
      sourceDeckId = 'B';
      targetDeckId = 'A';
    } else {
      // Both playing or neither playing: the clicked deck syncs its speed to the other deck
      targetDeckId = clickedDeckId;
      sourceDeckId = clickedDeckId === 'A' ? 'B' : 'A';
    }

    const target = targetDeckId === 'A' ? deckA : deckB;
    const source = sourceDeckId === 'A' ? deckA : deckB;

    if (!target.track || !source.track) return null;

    // Match BPM
    const targetBaseBpm = target.track.bpm;
    const desiredBpm = source.effectiveBpm;
    const neededTempo = (desiredBpm - targetBaseBpm) / targetBaseBpm;

    this.setTempo(targetDeckId, neededTempo, true);

    // If both are playing, align beat phase for seamless transitions
    if (source.isPlaying && target.isPlaying) {
      const beatSec = 60 / desiredBpm;
      const sourcePhase = source.currentTime % beatSec;
      const targetPhase = target.currentTime % beatSec;
      const diff = sourcePhase - targetPhase;
      this.scrubDeck(targetDeckId, target.currentTime + diff);
    } else if (source.isPlaying && !target.isPlaying) {
      target.cuePoint = 0;
    }

    this.notifyState();
    return { syncedDeck: targetDeckId, targetBpm: desiredBpm };
  }

  public scrubDeck(deckId: 'A' | 'B', targetTime: number) {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    if (!state.track) return;

    state.currentTime = Math.max(0, Math.min(state.duration, targetTime));
    if (state.isPlaying) {
      this.startBufferSource(deckId, state.currentTime);
    }
    this.notifyState();
  }

  public startScratch(deckId: 'A' | 'B') {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    state.isScratching = true;
  }

  public scratchMove(deckId: 'A' | 'B', deltaAngleDegrees: number) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!state.track?.buffer || !this.ctx || !nodes) return;

    state.rotationAngle += deltaAngleDegrees;

    // 360 degrees = ~1.8 seconds of audio (standard 33 1/3 RPM vinyl)
    const timeDelta = (deltaAngleDegrees / 360) * 1.8;
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + timeDelta));
    state.currentTime = newTime;

    // Provide momentary scratch chirp playback if moving
    if (Math.abs(deltaAngleDegrees) > 1.2) {
      if (!nodes.activeSource || !state.isPlaying) {
        this.startBufferSource(deckId, state.currentTime);
      }
      if (nodes.activeSource) {
        const scratchSpeed = Math.min(2.5, Math.max(0.2, Math.abs(deltaAngleDegrees) / 10));
        nodes.activeSource.playbackRate.setValueAtTime(scratchSpeed, this.ctx.currentTime);
      }
    }
    this.notifyState();
  }

  public endScratch(deckId: 'A' | 'B') {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    state.isScratching = false;
    this.updatePlaybackRate(deckId);
    this.notifyState();
  }

  private startBufferSource(deckId: 'A' | 'B', offset: number) {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes || !this.ctx || !state.track?.buffer) return;

    if (nodes.activeSource) {
      try {
        nodes.activeSource.stop();
        nodes.activeSource.disconnect();
      } catch {
        // ignore
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = state.track.buffer;
    source.loop = false;

    // Set playback rate based on tempo
    const rate = 1 + state.tempo;
    source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);

    source.connect(nodes.inputNode);

    nodes.activeSource = source;
    nodes.sourceStartedAt = this.ctx.currentTime;
    nodes.bufferOffset = offset;

    source.start(0, offset);

    source.onended = () => {
      if (nodes.activeSource === source && state.isPlaying && !state.loop.active) {
        state.isPlaying = false;
        state.currentTime = 0;
        this.notifyState();
      }
    };
  }

  private updatePlaybackRate(deckId: 'A' | 'B') {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes?.activeSource || !this.ctx) return;

    const rate = 1 + state.tempo;
    nodes.activeSource.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
  }

  // EQ & Filter controls
  public setEQ(deckId: 'A' | 'B', band: 'high' | 'mid' | 'low', value: number) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes || !this.ctx) return;

    state.eq[band] = value;
    const gainNode = band === 'high' ? nodes.highEQ : band === 'mid' ? nodes.midEQ : nodes.lowEQ;
    const isKilled = band === 'high' ? state.eq.killHigh : band === 'mid' ? state.eq.killMid : state.eq.killLow;

    gainNode.gain.setValueAtTime(isKilled ? -48 : value, this.ctx.currentTime);
    this.notifyState();
  }

  public toggleEQKill(deckId: 'A' | 'B', band: 'high' | 'mid' | 'low') {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes || !this.ctx) return;

    if (band === 'high') state.eq.killHigh = !state.eq.killHigh;
    if (band === 'mid') state.eq.killMid = !state.eq.killMid;
    if (band === 'low') state.eq.killLow = !state.eq.killLow;

    this.setEQ(deckId, band, state.eq[band]);
  }

  public setFilter(deckId: 'A' | 'B', value: number) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes || !this.ctx) return;

    state.filter = value; // -100 to +100

    if (Math.abs(value) < 3) {
      nodes.filter.type = 'allpass';
      nodes.filter.frequency.setValueAtTime(20000, this.ctx.currentTime);
    } else if (value < 0) {
      // Low-Pass Filter sweep
      nodes.filter.type = 'lowpass';
      // Map -3 to -100 to freq 18000Hz down to 150Hz exponentially
      const norm = Math.abs(value) / 100;
      const freq = 18000 * Math.pow(150 / 18000, norm);
      nodes.filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
      nodes.filter.Q.setValueAtTime(3.5, this.ctx.currentTime);
    } else {
      // High-Pass Filter sweep
      nodes.filter.type = 'highpass';
      // Map 3 to 100 to freq 20Hz up to 9000Hz exponentially
      const norm = value / 100;
      const freq = 20 * Math.pow(9000 / 20, norm);
      nodes.filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
      nodes.filter.Q.setValueAtTime(3.5, this.ctx.currentTime);
    }
    this.notifyState();
  }

  public toggleFX(deckId: 'A' | 'B', fxName: 'echo' | 'stutter' | 'flanger' | 'distortion' | 'reverb') {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes || !this.ctx) return;

    state.fx[fxName] = !state.fx[fxName];
    const active = state.fx[fxName];

    if (fxName === 'echo') {
      nodes.echoWet.gain.setValueAtTime(active ? 0.45 : 0, this.ctx.currentTime);
    } else if (fxName === 'flanger') {
      nodes.flangerWet.gain.setValueAtTime(active ? 0.5 : 0, this.ctx.currentTime);
    } else if (fxName === 'distortion') {
      nodes.distWet.gain.setValueAtTime(active ? 0.4 : 0, this.ctx.currentTime);
    } else if (fxName === 'reverb') {
      nodes.reverbWet.gain.setValueAtTime(active ? 0.4 : 0, this.ctx.currentTime);
    } else if (fxName === 'stutter') {
      // Instant beat roll loop
      if (active) {
        this.toggleLoop(deckId, 0.5);
      } else {
        if (state.loop.active) {
          this.toggleLoop(deckId);
        }
      }
    }
    this.notifyState();
  }

  public setDeckVolume(deckId: 'A' | 'B', volume: number) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    state.volume = Math.max(0, Math.min(1, volume));

    if (nodes && this.ctx) {
      nodes.deckGain.gain.setValueAtTime(state.volume, this.ctx.currentTime);
    }
    this.notifyState();
  }

  public updateCrossfader(value: number) {
    this.init();
    this.crossfader = Math.max(-1, Math.min(1, value));
    if (!this.crossfaderGainA || !this.crossfaderGainB || !this.ctx) return;

    const norm = (this.crossfader + 1) / 2; // 0 to 1

    let gainA = 1;
    let gainB = 1;

    if (this.crossfaderCurve === 'smooth') {
      // Constant Power curve (cos/sin)
      gainA = Math.cos((norm * Math.PI) / 2);
      gainB = Math.sin((norm * Math.PI) / 2);
    } else if (this.crossfaderCurve === 'linear') {
      gainA = 1 - norm;
      gainB = norm;
    } else if (this.crossfaderCurve === 'cut') {
      // Scratch cut curve: instant full on side, cuts sharp at extreme edges
      gainA = norm > 0.9 ? Math.max(0, (1 - norm) * 10) : 1;
      gainB = norm < 0.1 ? Math.max(0, norm * 10) : 1;
    }

    this.crossfaderGainA.gain.setValueAtTime(gainA, this.ctx.currentTime);
    this.crossfaderGainB.gain.setValueAtTime(gainB, this.ctx.currentTime);
    this.notifyState();
  }

  public setCrossfaderCurve(curve: CrossfaderCurve) {
    this.crossfaderCurve = curve;
    this.updateCrossfader(this.crossfader);
  }

  // Soundboard Trigger
  public triggerSoundboard(dropId: string) {
    this.init();
    if (!this.ctx || !this.soundboardGain) return;
    playSoundboardDrop(this.ctx, this.soundboardGain, dropId);
  }

  // Play custom user recorded voice clip directly through the soundboard broadcast bus
  private customBufferCache = new Map<string, AudioBuffer>();

  public async playCustomVoiceClip(clipId: string, blob: Blob, forceReload = false) {
    this.init();
    if (!this.ctx || !this.soundboardGain) return;

    try {
      let buffer = forceReload ? undefined : this.customBufferCache.get(clipId);
      if (!buffer) {
        const arrayBuf = await blob.arrayBuffer();
        buffer = await this.ctx.decodeAudioData(arrayBuf);
        this.customBufferCache.set(clipId, buffer);
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.soundboardGain);
      source.start();
    } catch (err) {
      console.warn('Failed to play custom voice clip:', err);
    }
  }

  public invalidateVoiceClip(clipId: string) {
    this.customBufferCache.delete(clipId);
  }

  public customCoverUrl = '/assets/aistudio/white_chocolate_studio_ce8a694c.JPG';
  public customVideoUrl: string | null = null;

  public setCustomCoverUrl(url: string) {
    this.customCoverUrl = url;
    this.notifyState();
  }

  public setCustomVideoUrl(url: string | null) {
    this.customVideoUrl = url;
    this.notifyState();
  }

  // Custom User Sound Upload to Soundboard
  public async loadCustomAudioFile(file: File, deckOrSlot: 'A' | 'B' | 'custom1' | 'custom2') {
    this.init();
    if (!this.ctx) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    if (deckOrSlot === 'A' || deckOrSlot === 'B') {
      const customTrack: TrackMetadata = {
        id: `custom_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'User Track',
        bpm: 125,
        duration: audioBuffer.duration,
        genre: 'User Audio',
        key: 'C Maj',
        color: deckOrSlot === 'A' ? '#ef4444' : '#3b82f6',
        coverImage: this.customCoverUrl,
        buffer: audioBuffer,
        waveformData: this.extractWaveformData(audioBuffer, 160)
      };
      this.loadTrack(deckOrSlot, customTrack);
    }
  }

  // Load AI-Generated Lyria Track from Data URL into Deck A or B
  public async loadGeneratedAudioDataUrl(
    dataUrl: string,
    title: string,
    deckId: 'A' | 'B',
    bpm = 124,
    coverUrl?: string
  ): Promise<TrackMetadata | null> {
    this.init();
    if (!this.ctx) return null;

    const response = await fetch(dataUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    const aiTrack: TrackMetadata = {
      id: `lyria_${Date.now()}`,
      title: title || 'Lyria Studio Stem',
      artist: 'White Chocolate Studio · Lyria',
      bpm,
      duration: audioBuffer.duration,
      genre: 'AI Generated Track',
      key: 'F Min',
      color: deckId === 'A' ? '#ef4444' : '#3b82f6',
      coverImage: coverUrl || this.customCoverUrl,
      buffer: audioBuffer,
      waveformData: this.extractWaveformData(audioBuffer, 160),
    };

    this.loadTrack(deckId, aiTrack);
    return aiTrack;
  }

  private extractWaveformData(buffer: AudioBuffer, points: number): number[] {
    const rawData = buffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / points);
    const waveform: number[] = [];
    for (let i = 0; i < points; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j += 8) {
        sum += Math.abs(rawData[blockStart + j] || 0);
      }
      waveform.push(Math.min(1, (sum / (blockSize / 8)) * 2.5));
    }
    return waveform;
  }

  // Stream Mic & Talkover
  public async toggleMicrophone() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.micActive) {
      // Disconnect
      if (this.micStream) {
        this.micStream.getTracks().forEach((t) => t.stop());
        this.micStream = null;
      }
      this.micActive = false;
      this.resetDucking();
      this.notifyState();
      return;
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.micSource = this.ctx.createMediaStreamSource(this.micStream);
      this.micGain = this.ctx.createGain();
      this.micGain.gain.setValueAtTime(this.micVolume, this.ctx.currentTime);

      this.micFilter = this.ctx.createBiquadFilter();
      this.applyMicEffect(this.micEffect);

      this.micSource.connect(this.micFilter);
      this.micFilter.connect(this.micGain);
      this.micGain.connect(this.masterGain);

      this.micActive = true;
      if (this.micTalkoverDucking) {
        this.applyDucking();
      }
      this.notifyState();
    } catch (err) {
      console.warn('Microphone permission or access error:', err);
      this.micActive = false;
      this.notifyState();
    }
  }

  public setMicEffect(effect: MicVoiceEffect) {
    this.micEffect = effect;
    this.applyMicEffect(effect);
    this.notifyState();
  }

  private applyMicEffect(effect: MicVoiceEffect) {
    if (!this.micFilter || !this.ctx) return;

    if (effect === 'radio') {
      this.micFilter.type = 'bandpass';
      this.micFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.micFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);
    } else if (effect === 'robot') {
      this.micFilter.type = 'peaking';
      this.micFilter.frequency.setValueAtTime(440, this.ctx.currentTime);
      this.micFilter.Q.setValueAtTime(12, this.ctx.currentTime);
      this.micFilter.gain.setValueAtTime(15, this.ctx.currentTime);
    } else {
      // Clean
      this.micFilter.type = 'highpass';
      this.micFilter.frequency.setValueAtTime(80, this.ctx.currentTime);
      this.micFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);
    }
  }

  public setMicVolume(vol: number) {
    this.micVolume = vol;
    if (this.micGain && this.ctx) {
      this.micGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
    this.notifyState();
  }

  private applyDucking() {
    if (!this.ctx || !this.deckNodes) return;
    // Duck deck channels smoothly down to 35%
    this.deckNodes.A.deckGain.gain.linearRampToValueAtTime(this.deckAState.volume * 0.35, this.ctx.currentTime + 0.1);
    this.deckNodes.B.deckGain.gain.linearRampToValueAtTime(this.deckBState.volume * 0.35, this.ctx.currentTime + 0.1);
  }

  private resetDucking() {
    if (!this.ctx || !this.deckNodes) return;
    this.deckNodes.A.deckGain.gain.linearRampToValueAtTime(this.deckAState.volume, this.ctx.currentTime + 0.25);
    this.deckNodes.B.deckGain.gain.linearRampToValueAtTime(this.deckBState.volume, this.ctx.currentTime + 0.25);
  }

  // Stream Recording
  public toggleRecording() {
    this.init();
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  public startRecording() {
    if (!this.streamDestination) return;

    this.recordedChunks = [];
    const stream = this.streamDestination.stream;

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }
    }

    try {
      this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveRecordedMix();
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.notifyState();
    } catch (err) {
      console.warn('Recording error:', err);
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.notifyState();
    }
  }

  private saveRecordedMix() {
    const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `White_Chocolate_Studio_Mix_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // Live Broadcast Stream Access (for TikTok Live / OBS)
  public getBroadcastStream(): MediaStream | null {
    return this.streamDestination ? this.streamDestination.stream : null;
  }

  // Core Engine animation loop (ticks at ~60fps)
  private startEngineLoop() {
    const tick = (timestamp: number) => {
      const deltaSec = (timestamp - this.lastTimestamp) / 1000 || 0.016;
      this.lastTimestamp = timestamp;

      // Update Deck A playback progress
      this.updateDeckProgress('A', deltaSec);
      // Update Deck B playback progress
      this.updateDeckProgress('B', deltaSec);

      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private updateDeckProgress(deckId: 'A' | 'B', deltaSec: number) {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;

    if (state.isPlaying && !state.isScratching) {
      const speed = 1 + state.tempo;
      state.currentTime += deltaSec * speed;

      // Vinyl visual rotation: ~200 deg/sec at 1.0x
      state.rotationAngle = (state.rotationAngle + deltaSec * 200 * speed) % 360;

      // Loop handling
      if (state.loop.active && state.track) {
        const beatSec = 60 / state.effectiveBpm;
        const loopDuration = state.loop.lengthBeats * beatSec;
        if (state.currentTime >= state.loop.startTime + loopDuration) {
          state.currentTime = state.loop.startTime;
          this.startBufferSource(deckId, state.currentTime);
        }
      }

      // End of track handling
      if (state.currentTime >= state.duration && state.duration > 0) {
        if (!state.loop.active) {
          this.stopDeck(deckId);
        }
      }
    }
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.ctx) {
      this.ctx.close();
    }
  }
}

interface DeckAudioNodes {
  inputNode: AudioNode;
  lowEQ: BiquadFilterNode;
  midEQ: BiquadFilterNode;
  highEQ: BiquadFilterNode;
  filter: BiquadFilterNode;
  echoDelay: DelayNode;
  echoWet: GainNode;
  flangerWet: GainNode;
  distWet: GainNode;
  reverbWet: GainNode;
  deckGain: GainNode;
  analyser: AnalyserNode;
  activeSource: AudioBufferSourceNode | null;
  sourceStartedAt: number;
  bufferOffset: number;
}
