/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Core Lowrider DJ Audio Engine, Voice Clip Sampler, Music Library, Donations & Subscriptions
 */

import {
  TrackMetadata,
  playSoundboardDrop,
  synthesizeVoiceClipPreset,
  downloadAudioBufferAsWav,
  STUDIO_ICON_URL,
} from './proceduralTracks';

export type CrossfaderCurve = 'smooth' | 'cut' | 'linear';
export type MicVoiceEffect =
  | 'clean'
  | 'chopped'
  | 'talkbox'
  | 'radio'
  | 'robot'
  | 'reverb'
  | 'echo';

export type FilterPresetId =
  | 'bypass'
  | 'sub_boost'
  | 'velvet_warmth'
  | 'lofi_telephone'
  | 'vocal_iso'
  | 'club_riser'
  | 'chopped_slow';

export interface VoiceClipSlot {
  id: string;
  slotNumber: number;
  label: string;
  buffer: AudioBuffer | null;
  duration: number;
  isRecording: boolean;
  isPlaying: boolean;
  fx: MicVoiceEffect;
  color: string;
}

export interface DonationEntry {
  id: string;
  donorHandle: string;
  amountUsd: number;
  tiktokCoins: number;
  method: 'TikTok Coins' | 'CashApp' | 'Venmo' | 'PayPal' | 'SuperChat';
  message: string;
  songRequest?: string;
  timestamp: string;
  shoutedOut: boolean;
}

export interface SubscriberEntry {
  id: string;
  subHandle: string;
  tierId: 'cruiser' | 'chrome_vip' | 'bullet_legend';
  tierName: string;
  months: number;
  isGifted: boolean;
  giftedCount?: number;
  message: string;
  timestamp: string;
}

export interface SubscriptionTier {
  id: 'cruiser' | 'chrome_vip' | 'bullet_legend';
  name: string;
  priceMonthly: number;
  badgeText: string;
  accentColor: string;
  perks: string[];
  activeSubscribers: number;
}

export interface TikTokStreamConfig {
  handle: string;
  streamTitle: string;
  followerCount: number;
  followerGoal: number;
  likeCount: number;
  viewerCount: number;
  autoDuckOnGift: boolean;
  lowLatencyMode: boolean;
  dmcaPitchGuard: boolean;
  aspectMode: '9:16' | '16:9';
  // Donations & Tip Jar State
  donationGoalTitle: string;
  donationCurrentUsd: number;
  donationTargetUsd: number;
  totalTikTokCoins: number;
  minSongRequestUsd: number;
  cashAppTag: string;
  venmoTag: string;
  paypalLink: string;
  donations: DonationEntry[];
  // Subscriptions State
  subscriberCount: number;
  subscriberGoal: number;
  subOnlyRequests: boolean;
  autoSubShoutout: boolean;
  subscriptionTiers: SubscriptionTier[];
  subscribers: SubscriberEntry[];
  // Live Stream Overlay Popup Alert (Gift / Donation / Subscription)
  activeGiftAlert: {
    id: number;
    alertType?: 'gift' | 'donation' | 'subscription';
    sender: string;
    giftName: string;
    icon: string;
    coins: number;
    subText?: string;
  } | null;
  recentChat: Array<{ id: number; user: string; text: string; badge?: string }>;
}

export interface ObsStudioConfig {
  websocketUrl: string;
  password: string;
  connected: boolean;
  activeScene: 'Lowrider Booth 9:16' | '100-Spoke Rim Cam' | 'Dual Turntable Close-Up' | 'BRB Hydraulic Screen';
  syncCrossfaderToScene: boolean;
  audioRouting: 'Master Broadcast Bus' | 'Split Cue + Master' | 'OBS Virtual Audio Cable';
}

export interface StreamOverlayConfig {
  wheelStyle: 'chrome_100_spoke' | 'gold_100_spoke' | 'classic_vinyl';
  themeColor: 'candy_red' | 'gold_24k' | 'cobalt_chrome' | 'emerald_hop';
  chromaKey: 'none' | 'green' | 'blue' | 'transparent';
  videoFilter: 'none' | 'westcoast_warm' | 'noir_chrome' | '90s_vhs' | 'cyber_candy';
  visualizerMode: 'chrome_bars' | 'circular_rim' | 'dual_wave';
  showNowPlaying: boolean;
  showChatTicker: boolean;
  showFollowerGoal: boolean;
  showDonationGoal: boolean;
  showSubGoal: boolean;
  show100SpokeSpinners: boolean;
  backdropZoom: number;
  marqueeText: string;
}

export interface DeckState {
  id: 'A' | 'B';
  track: TrackMetadata | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  tempo: number; // -25% to +25%
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
  filterResonance: number; // 0.7 to 12
  activeFilterPreset: FilterPresetId;
  eq: {
    high: number;
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
  platterStyle: 'chrome_100_spoke' | 'vinyl';
  isScratching: boolean;
  rotationAngle: number;
}

export class DJEngine {
  public ctx: AudioContext | null = null;

  // Master bus nodes
  private masterGain: GainNode | null = null;
  private subBassFilter: BiquadFilterNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  public masterAnalyser: AnalyserNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  // Master Enhancements
  public subBassBoostDb = 4; // 0 to 12 dB 808 Sub Enhancer
  public vinylCrackleEnabled = false;
  private crackleNode: AudioBufferSourceNode | null = null;
  private crackleGain: GainNode | null = null;
  public isCensorBleepActive = false;
  private censorOsc: OscillatorNode | null = null;
  private censorGain: GainNode | null = null;

  // Master Mix Recorder
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording = false;
  public recordingStartTime = 0;

  // Crossfader & Auto-Mix
  public crossfader = 0; // -1 (Deck A) to 0 (Center) to 1 (Deck B)
  public crossfaderCurve: CrossfaderCurve = 'smooth';
  public isAutoCrossfading = false;
  private crossfaderGainA: GainNode | null = null;
  private crossfaderGainB: GainNode | null = null;

  // Live DJ Microphone
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private micFilter: BiquadFilterNode | null = null;
  public micActive = false;
  public micTalkoverDucking = true;
  public micEffect: MicVoiceEffect = 'clean';
  public micVolume = 0.85;

  // Soundboard Bus
  private soundboardGain: GainNode | null = null;
  public soundboardPitch = 1.0; // 0.65 to 1.45
  public soundboardVolume = 0.9;

  // Swappable Voice Clip Slots on Mixer Deck
  public voiceClipSlots: VoiceClipSlot[] = [
    { id: 'vc_1', slotNumber: 1, label: 'WHITE CHOCOLATE TAG', buffer: null, duration: 0, isRecording: false, isPlaying: false, fx: 'talkbox', color: '#ef4444' },
    { id: 'vc_2', slotNumber: 2, label: 'WEST COAST ROLL CALL', buffer: null, duration: 0, isRecording: false, isPlaying: false, fx: 'clean', color: '#f59e0b' },
    { id: 'vc_3', slotNumber: 3, label: 'CHOPPED & SCREWED', buffer: null, duration: 0, isRecording: false, isPlaying: false, fx: 'chopped', color: '#a855f7' },
    { id: 'vc_4', slotNumber: 4, label: '100 SPOKE CHROME', buffer: null, duration: 0, isRecording: false, isPlaying: false, fx: 'echo', color: '#3b82f6' },
    { id: 'vc_5', slotNumber: 5, label: 'MIDNIGHT SLOW JAM INTRO', buffer: null, duration: 0, isRecording: false, isPlaying: false, fx: 'reverb', color: '#ec4899' },
    { id: 'vc_6', slotNumber: 6, label: 'TAP SCREEN & GIFT', buffer: null, duration: 0, isRecording: false, isPlaying: false, fx: 'radio', color: '#10b981' },
  ];
  public voiceSamplerFx: MicVoiceEffect = 'clean';
  public voiceSamplerVolume = 0.95;
  private slotMediaRecorder: MediaRecorder | null = null;
  private slotRecordChunks: Blob[] = [];
  private activeRecordingSlotIndex: number | null = null;
  private slotRecordTimeout: number | null = null;

  // TikTok, Donations, Subscriptions, OBS & Overlay Configurations
  public tiktokConfig: TikTokStreamConfig = {
    handle: '@whitechocolatedj',
    streamTitle: '100-Spoke Lowrider & 90s Vinyl Mix · Request in Chat!',
    followerCount: 1842,
    followerGoal: 2000,
    likeCount: 42800,
    viewerCount: 645,
    autoDuckOnGift: true,
    lowLatencyMode: true,
    dmcaPitchGuard: false,
    aspectMode: '9:16',
    // Donations & Tip Jar
    donationGoalTitle: 'Chrome 100-Spoke Vinyl Press & Late Night Stream Fund',
    donationCurrentUsd: 345,
    donationTargetUsd: 500,
    totalTikTokCoins: 18450,
    minSongRequestUsd: 5,
    cashAppTag: '$WhiteChocolateDJ',
    venmoTag: '@WhiteChocolateDJ',
    paypalLink: 'paypal.me/WhiteChocolateDJ',
    donations: [
      {
        id: 'don_1',
        donorHandle: '@impala_64_king',
        amountUsd: 25,
        tiktokCoins: 2500,
        method: 'TikTok Coins',
        message: 'Spin that Crenshaw 100-Spoke Bounce next! West Coast stand up!',
        songRequest: 'Crenshaw 100-Spoke Bounce',
        timestamp: '2m ago',
        shoutedOut: true,
      },
      {
        id: 'don_2',
        donorHandle: '@velvet_soul_queen',
        amountUsd: 15,
        tiktokCoins: 0,
        method: 'CashApp',
        message: 'Need that 90s Slow Jam blend for the late night cruise!',
        songRequest: 'Midnight Silk & Bullet Caps',
        timestamp: '5m ago',
        shoutedOut: false,
      },
      {
        id: 'don_3',
        donorHandle: '@houston_slab_84',
        amountUsd: 50,
        tiktokCoins: 5000,
        method: 'TikTok Coins',
        message: 'Chop and screw that next transition DJ White Chocolate!!',
        songRequest: 'Houston Slab Sippin (Chopped)',
        timestamp: '9m ago',
        shoutedOut: true,
      },
    ],
    // Subscriptions
    subscriberCount: 164,
    subscriberGoal: 200,
    subOnlyRequests: false,
    autoSubShoutout: true,
    subscriptionTiers: [
      {
        id: 'cruiser',
        name: 'Street Cruiser Sub',
        priceMonthly: 4.99,
        badgeText: '🛞 CRUISER',
        accentColor: '#3b82f6',
        perks: [
          'Custom 100-Spoke Chrome Rim Chat Badge',
          '8 Exclusive Lowrider & 90s Vinyl Emotes',
          'Sub-Only Chat & Throwback Poll Voting',
        ],
        activeSubscribers: 98,
      },
      {
        id: 'chrome_vip',
        name: '100-Spoke Chrome VIP',
        priceMonthly: 9.99,
        badgeText: '✨ CHROME VIP',
        accentColor: '#f59e0b',
        perks: [
          'Priority Song Request Queue Every Live Stream',
          'Custom Talkbox DJ Voice Tag Shoutout on Join',
          'Full Download Access to Recorded WAV Mix Sets',
        ],
        activeSubscribers: 49,
      },
      {
        id: 'bullet_legend',
        name: '24K Bullet Cap Legend',
        priceMonthly: 24.99,
        badgeText: '👑 24K LEGEND',
        accentColor: '#ef4444',
        perks: [
          'Dedicated Hydraulic Hop + Klaxon Horn Alert on Stream',
          'VIP Takeover: Pick 3 Back-to-Back Mix Tracks Live',
          'Handle Engraved on 3D Lowrider Stage Dashboard',
        ],
        activeSubscribers: 17,
      },
    ],
    subscribers: [
      {
        id: 'sub_1',
        subHandle: '@chrome_spokes_la',
        tierId: 'bullet_legend',
        tierName: '24K Bullet Cap Legend',
        months: 8,
        isGifted: false,
        message: '8 months locked in with the hardest Lowrider DJ on TikTok!',
        timestamp: '1m ago',
      },
      {
        id: 'sub_2',
        subHandle: '@lady_lowrider_99',
        tierId: 'chrome_vip',
        tierName: '100-Spoke Chrome VIP',
        months: 3,
        isGifted: true,
        giftedCount: 5,
        message: 'Gifted 5x Chrome VIP Subs to the chat!! Tap that screen!',
        timestamp: '4m ago',
      },
      {
        id: 'sub_3',
        subHandle: '@crenshaw_boogie',
        tierId: 'cruiser',
        tierName: 'Street Cruiser Sub',
        months: 1,
        isGifted: false,
        message: 'Just subscribed! Those 100-spoke platters are clean!',
        timestamp: '7m ago',
      },
    ],
    activeGiftAlert: null,
    recentChat: [
      { id: 1, user: '@impala_64_king', text: 'Dropped $25 for Crenshaw 100-Spoke Bounce!! 🔥🛞', badge: 'Top Donor' },
      { id: 2, user: '@chrome_spokes_la', text: '8-Month 24K Legend Sub in the building!', badge: '👑 24K LEGEND' },
      { id: 3, user: '@lady_lowrider_99', text: 'Just gifted 5 VIP subs to the family!', badge: '✨ CHROME VIP' },
      { id: 4, user: '@westcoast_breeze', text: 'Tapping the screen! 50k likes incoming 💯', badge: '🛞 CRUISER' },
    ],
  };

  public obsConfig: ObsStudioConfig = {
    websocketUrl: 'ws://localhost:4455',
    password: '',
    connected: false,
    activeScene: 'Lowrider Booth 9:16',
    syncCrossfaderToScene: true,
    audioRouting: 'Master Broadcast Bus',
  };

  public overlayConfig: StreamOverlayConfig = {
    wheelStyle: 'chrome_100_spoke',
    themeColor: 'candy_red',
    chromaKey: 'none',
    videoFilter: 'westcoast_warm',
    visualizerMode: 'chrome_bars',
    showNowPlaying: true,
    showChatTicker: true,
    showFollowerGoal: true,
    showDonationGoal: true,
    showSubGoal: true,
    show100SpokeSpinners: true,
    backdropZoom: 75,
    marqueeText: 'WELCOME TO WHITE CHOCOLATE STUDIO · 100-SPOKE CHROME & BULLET CAP EDITION · TIPS & SUBS UNLOCK PRIORITY SONG REQUESTS!',
  };

  // Deck Audio Nodes
  private deckNodes: {
    A: DeckAudioNodes;
    B: DeckAudioNodes;
  } | null = null;

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
    effectiveBpm: 94,
    isCuePressed: false,
    cuePoint: 0,
    hotCues: [null, null, null, null],
    loop: { active: false, lengthBeats: 4, startTime: 0 },
    filter: 0,
    filterResonance: 3.5,
    activeFilterPreset: 'bypass',
    eq: { high: 0, mid: 0, low: 0, killHigh: false, killMid: false, killLow: false },
    fx: { echo: false, stutter: false, flanger: false, distortion: false, reverb: false },
    platterStyle: 'chrome_100_spoke',
    isScratching: false,
    rotationAngle: 0,
  };

  public deckBState: DeckState = {
    id: 'B',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.85,
    tempo: 0,
    effectiveBpm: 86,
    isCuePressed: false,
    cuePoint: 0,
    hotCues: [null, null, null, null],
    loop: { active: false, lengthBeats: 4, startTime: 0 },
    filter: 0,
    filterResonance: 3.5,
    activeFilterPreset: 'bypass',
    eq: { high: 0, mid: 0, low: 0, killHigh: false, killMid: false, killLow: false },
    fx: { echo: false, stutter: false, flanger: false, distortion: false, reverb: false },
    platterStyle: 'chrome_100_spoke',
    isScratching: false,
    rotationAngle: 0,
  };

  private animFrameId: number | null = null;
  private lastTimestamp = 0;
  private tapTimestamps: number[] = [];

  public customCoverUrl = STUDIO_ICON_URL;
  public customVideoUrl: string | null = null;

  constructor() {
    this.preloadDefaultVoiceClips();
  }

  private async preloadDefaultVoiceClips() {
    try {
      for (let i = 0; i < this.voiceClipSlots.length; i++) {
        const res = await synthesizeVoiceClipPreset(i);
        this.voiceClipSlots[i].buffer = res.buffer;
        this.voiceClipSlots[i].duration = res.duration;
        this.voiceClipSlots[i].label = res.label;
      }
      this.notifyState();
    } catch (e) {
      console.warn('Failed to preload default voice clips:', e);
    }
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // 808 Sub-Harmonic Bass Enhancer on Master Bus
    this.subBassFilter = this.ctx.createBiquadFilter();
    this.subBassFilter.type = 'lowshelf';
    this.subBassFilter.frequency.setValueAtTime(68, this.ctx.currentTime);
    this.subBassFilter.gain.setValueAtTime(this.subBassBoostDb, this.ctx.currentTime);

    // Master brickwall limiter for clean TikTok LIVE audio
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
    this.masterGain.connect(this.subBassFilter);
    this.subBassFilter.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
    this.masterAnalyser.connect(this.streamDestination);

    // Crossfader Gain Nodes
    this.crossfaderGainA = this.ctx.createGain();
    this.crossfaderGainB = this.ctx.createGain();
    this.crossfaderGainA.connect(this.masterGain);
    this.crossfaderGainB.connect(this.masterGain);

    // Soundboard Bus
    this.soundboardGain = this.ctx.createGain();
    this.soundboardGain.gain.setValueAtTime(this.soundboardVolume, this.ctx.currentTime);
    this.soundboardGain.connect(this.masterGain);

    // Build Deck DSP chains
    this.deckNodes = {
      A: this.createDeckChain('A', this.crossfaderGainA),
      B: this.createDeckChain('B', this.crossfaderGainB),
    };

    this.updateCrossfader(this.crossfader);
    this.startEngineLoop();
  }

  private createDeckChain(_deckId: 'A' | 'B', destination: GainNode): DeckAudioNodes {
    if (!this.ctx) throw new Error('AudioContext missing');
    const ctx = this.ctx;

    const deckGain = ctx.createGain();
    deckGain.gain.setValueAtTime(0.85, ctx.currentTime);

    const lowEQ = ctx.createBiquadFilter();
    lowEQ.type = 'lowshelf';
    lowEQ.frequency.setValueAtTime(250, ctx.currentTime);

    const midEQ = ctx.createBiquadFilter();
    midEQ.type = 'peaking';
    midEQ.frequency.setValueAtTime(1000, ctx.currentTime);
    midEQ.Q.setValueAtTime(1.0, ctx.currentTime);

    const highEQ = ctx.createBiquadFilter();
    highEQ.type = 'highshelf';
    highEQ.frequency.setValueAtTime(3200, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'allpass';
    filter.frequency.setValueAtTime(20000, ctx.currentTime);

    // Echo Delay
    const echoDelay = ctx.createDelay();
    echoDelay.delayTime.setValueAtTime(0.24, ctx.currentTime);
    const echoFeedback = ctx.createGain();
    echoFeedback.gain.setValueAtTime(0.45, ctx.currentTime);
    const echoWet = ctx.createGain();
    echoWet.gain.setValueAtTime(0, ctx.currentTime);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoDelay.connect(echoWet);

    // Flanger
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

    // Distortion
    const distortionNode = ctx.createWaveShaper();
    distortionNode.curve = this.makeDistortionCurve(30);
    distortionNode.oversample = '4x';
    const distWet = ctx.createGain();
    distWet.gain.setValueAtTime(0, ctx.currentTime);
    distortionNode.connect(distWet);

    // Reverb
    const reverbNode = ctx.createConvolver();
    reverbNode.buffer = this.createSyntheticImpulseResponse(ctx, 2.2, 2.0);
    const reverbWet = ctx.createGain();
    reverbWet.gain.setValueAtTime(0, ctx.currentTime);
    reverbNode.connect(reverbWet);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;

    lowEQ.connect(midEQ);
    midEQ.connect(highEQ);
    highEQ.connect(filter);

    filter.connect(deckGain);

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
      bufferOffset: 0,
    };
  }

  public getDeckAnalyser(deckId: 'A' | 'B'): AnalyserNode | null {
    if (!this.deckNodes) return null;
    return deckId === 'A' ? this.deckNodes.A.analyser : this.deckNodes.B.analyser;
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
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
    return impulse;
  }

  public registerStateListener(cb: () => void) {
    this.onStateChange = cb;
  }

  public notifyUpdate() {
    this.notifyState();
  }

  // ===========================================================================
  // MASTER ENHANCEMENTS: SUB-BASS 808 BOOST, VINYL CRACKLE, CENSOR BLEEP
  // ===========================================================================
  public setSubBassBoost(db: number) {
    this.init();
    this.subBassBoostDb = Math.max(0, Math.min(12, db));
    if (this.subBassFilter && this.ctx) {
      this.subBassFilter.gain.setValueAtTime(this.subBassBoostDb, this.ctx.currentTime);
    }
    this.notifyState();
  }

  public toggleVinylCrackle() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    this.vinylCrackleEnabled = !this.vinylCrackleEnabled;
    if (this.vinylCrackleEnabled) {
      const len = this.ctx.sampleRate * 3;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() > 0.996 ? (Math.random() * 2 - 1) * 0.55 : (Math.random() * 2 - 1) * 0.015;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      src.start();
      this.crackleNode = src;
      this.crackleGain = gain;
    } else {
      if (this.crackleNode) {
        try {
          this.crackleNode.stop();
          this.crackleNode.disconnect();
        } catch {
          // ignore
        }
        this.crackleNode = null;
      }
    }
    this.notifyState();
  }

  public setCensorBleep(active: boolean) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    if (active === this.isCensorBleepActive) return;

    this.isCensorBleepActive = active;
    if (active) {
      this.applyDucking();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      this.censorOsc = osc;
      this.censorGain = gain;
    } else {
      if (this.censorOsc) {
        try {
          this.censorOsc.stop();
          this.censorOsc.disconnect();
        } catch {
          // ignore
        }
        this.censorOsc = null;
      }
      if (!this.micActive) {
        this.resetDucking();
      }
    }
    this.notifyState();
  }

  // ===========================================================================
  // SWAPPABLE VOICE CLIP RECORDER & VOICE FX SLOTS ON MIXER DECK
  // ===========================================================================
  public async toggleRecordVoiceSlot(slotIndex: number) {
    this.init();
    const slot = this.voiceClipSlots[slotIndex];
    if (!slot) return;

    if (slot.isRecording) {
      this.stopRecordingVoiceSlot(slotIndex);
    } else {
      await this.startRecordingVoiceSlot(slotIndex);
    }
  }

  public async startRecordingVoiceSlot(slotIndex: number) {
    this.init();
    if (!this.ctx) return;

    if (this.activeRecordingSlotIndex !== null) {
      this.stopRecordingVoiceSlot(this.activeRecordingSlotIndex);
    }

    const slot = this.voiceClipSlots[slotIndex];
    if (!slot) return;

    slot.isRecording = true;
    this.activeRecordingSlotIndex = slotIndex;
    this.slotRecordChunks = [];
    this.notifyState();

    try {
      const stream =
        this.micStream ||
        (await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }));

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.slotMediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.slotRecordChunks.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(this.slotRecordChunks, { type: mimeType || 'audio/webm' });
          const arr = await blob.arrayBuffer();
          if (this.ctx && arr.byteLength > 0) {
            const audioBuffer = await this.ctx.decodeAudioData(arr);
            slot.buffer = audioBuffer;
            slot.duration = audioBuffer.duration;
            slot.label = `MIC CLIP #${slot.slotNumber}`;
          }
        } catch {
          const fallback = await synthesizeVoiceClipPreset(slotIndex);
          slot.buffer = fallback.buffer;
          slot.duration = fallback.duration;
          slot.label = `STUDIO CLIP #${slot.slotNumber}`;
        }
        slot.isRecording = false;
        this.activeRecordingSlotIndex = null;
        this.notifyState();
      };

      recorder.start(100);

      this.slotRecordTimeout = window.setTimeout(() => {
        if (slot.isRecording) {
          this.stopRecordingVoiceSlot(slotIndex);
        }
      }, 6000);
    } catch {
      this.slotRecordTimeout = window.setTimeout(async () => {
        const synth = await synthesizeVoiceClipPreset(slotIndex + Math.floor(Math.random() * 6));
        slot.buffer = synth.buffer;
        slot.duration = synth.duration;
        slot.label = `VOICE CLIP #${slot.slotNumber}`;
        slot.isRecording = false;
        this.activeRecordingSlotIndex = null;
        this.notifyState();
      }, 1200);
    }
  }

  public stopRecordingVoiceSlot(slotIndex: number) {
    const slot = this.voiceClipSlots[slotIndex];
    if (!slot) return;

    if (this.slotRecordTimeout) {
      clearTimeout(this.slotRecordTimeout);
      this.slotRecordTimeout = null;
    }

    if (this.slotMediaRecorder && this.slotMediaRecorder.state !== 'inactive') {
      try {
        this.slotMediaRecorder.stop();
      } catch {
        slot.isRecording = false;
      }
    } else {
      slot.isRecording = false;
      this.activeRecordingSlotIndex = null;
    }
    this.notifyState();
  }

  public playVoiceSlot(slotIndex: number, overrideFx?: MicVoiceEffect) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const slot = this.voiceClipSlots[slotIndex];
    if (!slot || !slot.buffer) return;

    const fxMode = overrideFx || this.voiceSamplerFx || slot.fx;
    const source = this.ctx.createBufferSource();
    source.buffer = slot.buffer;

    let playbackRate = 1.0;
    if (fxMode === 'chopped') {
      playbackRate = 0.74;
    }
    source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    const outGain = this.ctx.createGain();
    outGain.gain.setValueAtTime(this.voiceSamplerVolume, this.ctx.currentTime);

    this.configureVoiceFxChain(source, filter, outGain, fxMode);
    outGain.connect(this.masterGain);

    slot.isPlaying = true;
    if (this.micTalkoverDucking) {
      this.applyDucking();
    }
    this.notifyState();

    source.start(0);
    source.onended = () => {
      slot.isPlaying = false;
      if (!this.micActive) {
        this.resetDucking();
      }
      this.notifyState();
    };
  }

  private configureVoiceFxChain(
    source: AudioNode,
    filter: BiquadFilterNode,
    outGain: GainNode,
    fxMode: MicVoiceEffect
  ) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (fxMode === 'radio') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450, now);
      filter.Q.setValueAtTime(3.2, now);
      source.connect(filter);
      filter.connect(outGain);
    } else if (fxMode === 'talkbox') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(980, now);
      filter.Q.setValueAtTime(5.5, now);
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(18);
      source.connect(shaper);
      shaper.connect(filter);
      filter.connect(outGain);
    } else if (fxMode === 'robot') {
      filter.type = 'peaking';
      filter.frequency.setValueAtTime(440, now);
      filter.Q.setValueAtTime(14, now);
      filter.gain.setValueAtTime(16, now);
      source.connect(filter);
      filter.connect(outGain);
    } else if (fxMode === 'chopped') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.Q.setValueAtTime(2.0, now);
      source.connect(filter);
      filter.connect(outGain);
    } else if (fxMode === 'echo') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(100, now);
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.22, now);
      const fb = this.ctx.createGain();
      fb.gain.setValueAtTime(0.4, now);
      delay.connect(fb);
      fb.connect(delay);
      source.connect(filter);
      filter.connect(outGain);
      filter.connect(delay);
      delay.connect(outGain);
    } else if (fxMode === 'reverb') {
      const conv = this.ctx.createConvolver();
      conv.buffer = this.createSyntheticImpulseResponse(this.ctx, 1.8, 2.2);
      const wet = this.ctx.createGain();
      wet.gain.setValueAtTime(0.5, now);
      source.connect(outGain);
      source.connect(conv);
      conv.connect(wet);
      wet.connect(outGain);
    } else {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(85, now);
      source.connect(filter);
      filter.connect(outGain);
    }
  }

  public swapVoiceSlots(indexA: number, indexB: number) {
    if (
      indexA === indexB ||
      indexA < 0 ||
      indexB < 0 ||
      indexA >= this.voiceClipSlots.length ||
      indexB >= this.voiceClipSlots.length
    ) {
      return;
    }

    const slotA = this.voiceClipSlots[indexA];
    const slotB = this.voiceClipSlots[indexB];

    const tempBuffer = slotA.buffer;
    const tempLabel = slotA.label;
    const tempDuration = slotA.duration;
    const tempFx = slotA.fx;
    const tempColor = slotA.color;

    slotA.buffer = slotB.buffer;
    slotA.label = slotB.label;
    slotA.duration = slotB.duration;
    slotA.fx = slotB.fx;
    slotA.color = slotB.color;

    slotB.buffer = tempBuffer;
    slotB.label = tempLabel;
    slotB.duration = tempDuration;
    slotB.fx = tempFx;
    slotB.color = tempColor;

    this.notifyState();
  }

  public async uploadVoiceSlotFile(slotIndex: number, file: File) {
    this.init();
    if (!this.ctx) return;
    const slot = this.voiceClipSlots[slotIndex];
    if (!slot) return;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    slot.buffer = audioBuffer;
    slot.duration = audioBuffer.duration;
    slot.label = file.name.replace(/\.[^/.]+$/, '').slice(0, 22).toUpperCase();
    this.notifyState();
  }

  public downloadVoiceSlotWav(slotIndex: number) {
    const slot = this.voiceClipSlots[slotIndex];
    if (!slot || !slot.buffer) return;
    downloadAudioBufferAsWav(slot.buffer, `VoiceClip_Slot${slot.slotNumber}_${slot.label}`);
  }

  public renameVoiceSlot(slotIndex: number, label: string) {
    const slot = this.voiceClipSlots[slotIndex];
    if (!slot) return;
    slot.label = label.toUpperCase();
    this.notifyState();
  }

  // ===========================================================================
  // DECK PLAYBACK, TRACK UPLOAD & WAV DOWNLOAD
  // ===========================================================================
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

  public downloadDeckTrackWav(deckId: 'A' | 'B') {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    if (!state.track?.buffer) return;
    downloadAudioBufferAsWav(state.track.buffer, `${state.track.title}_Deck${deckId}`);
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
        // ignore
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
        this.pauseDeck(deckId);
        state.currentTime = state.cuePoint;
      } else {
        this.startBufferSource(deckId, state.cuePoint);
        state.isPlaying = true;
      }
    } else {
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
      state.hotCues[index] = state.currentTime;
    } else {
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

  public setTempo(deckId: 'A' | 'B', tempoPercent: number) {
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    state.tempo = Math.max(-0.25, Math.min(0.25, tempoPercent));
    if (state.track) {
      state.effectiveBpm = Math.round(state.track.bpm * (1 + state.tempo) * 10) / 10;
    }
    this.updatePlaybackRate(deckId);
    this.notifyState();
  }

  public tapTempo(deckId: 'A' | 'B') {
    const now = performance.now();
    this.tapTimestamps = this.tapTimestamps.filter((t) => now - t < 3000);
    this.tapTimestamps.push(now);

    if (this.tapTimestamps.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < this.tapTimestamps.length; i++) {
        totalInterval += this.tapTimestamps[i] - this.tapTimestamps[i - 1];
      }
      const avgMs = totalInterval / (this.tapTimestamps.length - 1);
      const tappedBpm = Math.max(60, Math.min(180, Math.round(60000 / avgMs)));
      const state = deckId === 'A' ? this.deckAState : this.deckBState;
      if (state.track) {
        const neededTempo = (tappedBpm - state.track.bpm) / state.track.bpm;
        this.setTempo(deckId, neededTempo);
      }
    }
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

  public syncDeck(targetDeck: 'A' | 'B') {
    const target = targetDeck === 'A' ? this.deckAState : this.deckBState;
    const other = targetDeck === 'A' ? this.deckBState : this.deckAState;

    if (!target.track || !other.track) return;

    const targetBaseBpm = target.track.bpm;
    const desiredBpm = other.effectiveBpm;
    const neededTempo = (desiredBpm - targetBaseBpm) / targetBaseBpm;

    this.setTempo(targetDeck, neededTempo);

    if (other.isPlaying && target.isPlaying) {
      const beatSec = 60 / desiredBpm;
      const otherPhase = other.currentTime % beatSec;
      const targetPhase = target.currentTime % beatSec;
      const diff = otherPhase - targetPhase;
      this.scrubDeck(targetDeck, target.currentTime + diff);
    }
    this.notifyState();
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

    const timeDelta = (deltaAngleDegrees / 360) * 1.8;
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + timeDelta));
    state.currentTime = newTime;

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

    const dmcaShift = this.tiktokConfig.dmcaPitchGuard ? 0.025 : 0;
    const rate = Math.max(0.25, 1 + state.tempo + dmcaShift);
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

    const dmcaShift = this.tiktokConfig.dmcaPitchGuard ? 0.025 : 0;
    const rate = Math.max(0.25, 1 + state.tempo + dmcaShift);
    nodes.activeSource.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
  }

  // ===========================================================================
  // EQ, RESONANT FILTERS & STUDIO FILTER PRESETS
  // ===========================================================================
  public setEQ(deckId: 'A' | 'B', band: 'high' | 'mid' | 'low', value: number) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    const nodes = deckId === 'A' ? this.deckNodes?.A : this.deckNodes?.B;
    if (!nodes || !this.ctx) return;

    state.eq[band] = value;
    const gainNode = band === 'high' ? nodes.highEQ : band === 'mid' ? nodes.midEQ : nodes.lowEQ;
    const isKilled =
      band === 'high' ? state.eq.killHigh : band === 'mid' ? state.eq.killMid : state.eq.killLow;

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

    state.filter = value;

    if (Math.abs(value) < 3) {
      nodes.filter.type = 'allpass';
      nodes.filter.frequency.setValueAtTime(20000, this.ctx.currentTime);
    } else if (value < 0) {
      nodes.filter.type = 'lowpass';
      const norm = Math.abs(value) / 100;
      const freq = 18000 * Math.pow(150 / 18000, norm);
      nodes.filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
      nodes.filter.Q.setValueAtTime(state.filterResonance, this.ctx.currentTime);
    } else {
      nodes.filter.type = 'highpass';
      const norm = value / 100;
      const freq = 20 * Math.pow(9000 / 20, norm);
      nodes.filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
      nodes.filter.Q.setValueAtTime(state.filterResonance, this.ctx.currentTime);
    }
    this.notifyState();
  }

  public applyFilterPreset(deckId: 'A' | 'B', preset: FilterPresetId) {
    this.init();
    const state = deckId === 'A' ? this.deckAState : this.deckBState;
    state.activeFilterPreset = preset;

    switch (preset) {
      case 'bypass':
        this.setEQ(deckId, 'low', 0);
        this.setEQ(deckId, 'mid', 0);
        this.setEQ(deckId, 'high', 0);
        this.setFilter(deckId, 0);
        if (Math.abs(state.tempo) > 0.17) this.setTempo(deckId, 0);
        break;
      case 'sub_boost':
        this.setEQ(deckId, 'low', 5);
        this.setEQ(deckId, 'mid', -2);
        this.setEQ(deckId, 'high', 2);
        this.setFilter(deckId, -18);
        break;
      case 'velvet_warmth':
        this.setEQ(deckId, 'low', 3);
        this.setEQ(deckId, 'mid', 2);
        this.setEQ(deckId, 'high', -4);
        this.setFilter(deckId, -35);
        break;
      case 'lofi_telephone':
        this.setEQ(deckId, 'low', -18);
        this.setEQ(deckId, 'mid', 5);
        this.setEQ(deckId, 'high', -14);
        this.setFilter(deckId, 42);
        break;
      case 'vocal_iso':
        this.setEQ(deckId, 'low', -22);
        this.setEQ(deckId, 'mid', 6);
        this.setEQ(deckId, 'high', 1);
        this.setFilter(deckId, 28);
        break;
      case 'club_riser':
        this.setEQ(deckId, 'low', -12);
        this.setFilter(deckId, 65);
        break;
      case 'chopped_slow':
        this.setEQ(deckId, 'low', 5);
        this.setFilter(deckId, -28);
        this.setTempo(deckId, -0.2);
        break;
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

    const norm = (this.crossfader + 1) / 2;

    let gainA = 1;
    let gainB = 1;

    if (this.crossfaderCurve === 'smooth') {
      gainA = Math.cos((norm * Math.PI) / 2);
      gainB = Math.sin((norm * Math.PI) / 2);
    } else if (this.crossfaderCurve === 'linear') {
      gainA = 1 - norm;
      gainB = norm;
    } else if (this.crossfaderCurve === 'cut') {
      gainA = norm > 0.9 ? Math.max(0, (1 - norm) * 10) : 1;
      gainB = norm < 0.1 ? Math.max(0, norm * 10) : 1;
    }

    this.crossfaderGainA.gain.setValueAtTime(gainA, this.ctx.currentTime);
    this.crossfaderGainB.gain.setValueAtTime(gainB, this.ctx.currentTime);
    this.notifyState();
  }

  public triggerAutoCrossfade(durationSec: number = 4.0) {
    if (this.isAutoCrossfading) return;
    this.init();
    this.isAutoCrossfading = true;
    const startVal = this.crossfader;
    const targetVal = startVal <= 0 ? 1 : -1;
    const startTime = performance.now();

    if (targetVal > 0 && !this.deckBState.isPlaying) {
      this.playDeck('B');
    } else if (targetVal < 0 && !this.deckAState.isPlaying) {
      this.playDeck('A');
    }

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / (durationSec * 1000));
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.updateCrossfader(startVal + (targetVal - startVal) * eased);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        this.isAutoCrossfading = false;
        this.notifyState();
      }
    };
    requestAnimationFrame(step);
  }

  public setCrossfaderCurve(curve: CrossfaderCurve) {
    this.crossfaderCurve = curve;
    this.updateCrossfader(this.crossfader);
  }

  // ===========================================================================
  // SOUNDBOARD, TIKTOK GIFTS, DONATIONS & SUBSCRIPTIONS
  // ===========================================================================
  public triggerSoundboard(dropId: string) {
    this.init();
    if (!this.ctx || !this.soundboardGain) return;
    this.soundboardGain.gain.setValueAtTime(this.soundboardVolume, this.ctx.currentTime);
    playSoundboardDrop(this.ctx, this.soundboardGain, dropId, this.soundboardPitch);
  }

  public triggerTikTokGiftAlert(giftType: 'rose' | 'galaxy' | 'money_gun' | 'lowrider_hop' | 'lion') {
    const gifts = {
      rose: { sender: '@westcoast_queen', giftName: 'Candy Red Rose x25', icon: '🌹', coins: 25, usd: 1, drop: 'chimes_sweep' },
      galaxy: { sender: '@chrome_spokes_la', giftName: 'West Coast Galaxy', icon: '🌌', coins: 1000, usd: 15, drop: 'westcoast_whistle' },
      money_gun: { sender: '@big_hoss_187', giftName: 'Make It Rain Cash Gun', icon: '💵', coins: 500, usd: 8, drop: 'money_cash' },
      lowrider_hop: { sender: '@impala_64_king', giftName: '100-Spoke Hydraulic Hop', icon: '🛞', coins: 2500, usd: 35, drop: 'hydraulic_pop' },
      lion: { sender: '@vip_platinum_dj', giftName: 'Golden Studio Lion', icon: '🦁', coins: 29999, usd: 400, drop: 'airhorn' },
    };

    const g = gifts[giftType];
    this.tiktokConfig.activeGiftAlert = {
      id: Date.now(),
      alertType: 'gift',
      sender: g.sender,
      giftName: g.giftName,
      icon: g.icon,
      coins: g.coins,
    };
    this.tiktokConfig.totalTikTokCoins += g.coins;
    this.tiktokConfig.donationCurrentUsd += g.usd;
    this.tiktokConfig.followerCount += 3;
    this.tiktokConfig.likeCount += 250;
    this.tiktokConfig.recentChat = [
      {
        id: Date.now(),
        user: g.sender,
        text: `Sent ${g.giftName} (${g.coins} Coins)! Keep spinning that fire!`,
        badge: 'Gifter',
      },
      ...this.tiktokConfig.recentChat.slice(0, 8),
    ];

    if (this.tiktokConfig.autoDuckOnGift) {
      this.applyDucking();
      setTimeout(() => {
        if (!this.micActive) this.resetDucking();
      }, 1800);
    }

    this.triggerSoundboard(g.drop);
    this.notifyState();

    setTimeout(() => {
      this.tiktokConfig.activeGiftAlert = null;
      this.notifyState();
    }, 4500);
  }

  public addDonation(entry: {
    donorHandle: string;
    amountUsd: number;
    method: DonationEntry['method'];
    message: string;
    songRequest?: string;
  }) {
    const coins = entry.method === 'TikTok Coins' ? Math.round(entry.amountUsd * 100) : 0;
    const newDonation: DonationEntry = {
      id: `don_${Date.now()}`,
      donorHandle: entry.donorHandle.startsWith('@') ? entry.donorHandle : `@${entry.donorHandle}`,
      amountUsd: entry.amountUsd,
      tiktokCoins: coins,
      method: entry.method,
      message: entry.message || 'Keep the 100-spoke lowrider mix rolling!',
      songRequest: entry.songRequest,
      timestamp: 'Just now',
      shoutedOut: false,
    };

    this.tiktokConfig.donations = [newDonation, ...this.tiktokConfig.donations];
    this.tiktokConfig.donationCurrentUsd += entry.amountUsd;
    if (coins > 0) {
      this.tiktokConfig.totalTikTokCoins += coins;
    }

    this.tiktokConfig.recentChat = [
      {
        id: Date.now(),
        user: newDonation.donorHandle,
        text: `Tipped $${entry.amountUsd} via ${entry.method}${entry.songRequest ? ` · Request: "${entry.songRequest}"` : ''}!`,
        badge: '💸 DONOR',
      },
      ...this.tiktokConfig.recentChat.slice(0, 8),
    ];

    this.triggerDonationShoutout(newDonation.id);
  }

  public triggerDonationShoutout(donationId: string) {
    const found = this.tiktokConfig.donations.find((d) => d.id === donationId);
    if (!found) return;

    found.shoutedOut = true;
    this.tiktokConfig.activeGiftAlert = {
      id: Date.now(),
      alertType: 'donation',
      sender: found.donorHandle,
      giftName: `$${found.amountUsd} ${found.method} Tip`,
      icon: '💸',
      coins: found.tiktokCoins,
      subText: found.songRequest ? `Requested: ${found.songRequest}` : found.message,
    };

    if (this.tiktokConfig.autoDuckOnGift) {
      this.applyDucking();
      setTimeout(() => {
        if (!this.micActive) this.resetDucking();
      }, 2000);
    }

    this.triggerSoundboard('money_cash');
    this.notifyState();

    setTimeout(() => {
      this.tiktokConfig.activeGiftAlert = null;
      this.notifyState();
    }, 4500);
  }

  public addSubscription(entry: {
    subHandle: string;
    tierId: SubscriptionTier['id'];
    months: number;
    isGifted: boolean;
    giftedCount?: number;
    message?: string;
  }) {
    const tier =
      this.tiktokConfig.subscriptionTiers.find((t) => t.id === entry.tierId) ||
      this.tiktokConfig.subscriptionTiers[0];

    const handle = entry.subHandle.startsWith('@') ? entry.subHandle : `@${entry.subHandle}`;
    const subCountAdded = entry.isGifted ? entry.giftedCount || 1 : 1;

    const newSub: SubscriberEntry = {
      id: `sub_${Date.now()}`,
      subHandle: handle,
      tierId: tier.id,
      tierName: tier.name,
      months: entry.months,
      isGifted: entry.isGifted,
      giftedCount: entry.giftedCount,
      message:
        entry.message ||
        (entry.isGifted
          ? `Gifted ${subCountAdded}x ${tier.name} subscriptions to the stream!`
          : `Subscribed to ${tier.name} (${entry.months} Mo)!`),
      timestamp: 'Just now',
    };

    this.tiktokConfig.subscribers = [newSub, ...this.tiktokConfig.subscribers];
    this.tiktokConfig.subscriberCount += subCountAdded;
    tier.activeSubscribers += subCountAdded;

    this.tiktokConfig.recentChat = [
      {
        id: Date.now(),
        user: handle,
        text: newSub.message,
        badge: tier.badgeText,
      },
      ...this.tiktokConfig.recentChat.slice(0, 8),
    ];

    this.tiktokConfig.activeGiftAlert = {
      id: Date.now(),
      alertType: 'subscription',
      sender: handle,
      giftName: entry.isGifted
        ? `Gifted ${subCountAdded}x ${tier.name}s!`
        : `${tier.name} (${entry.months} Mo)`,
      icon: tier.id === 'bullet_legend' ? '👑' : tier.id === 'chrome_vip' ? '✨' : '🛞',
      coins: 0,
      subText: newSub.message,
    };

    if (this.tiktokConfig.autoDuckOnGift) {
      this.applyDucking();
      setTimeout(() => {
        if (!this.micActive) this.resetDucking();
      }, 2000);
    }

    this.triggerSoundboard(tier.id === 'bullet_legend' ? 'hydraulic_pop' : 'chimes_sweep');
    this.notifyState();

    setTimeout(() => {
      this.tiktokConfig.activeGiftAlert = null;
      this.notifyState();
    }, 4500);
  }

  public setCustomCoverUrl(url: string) {
    this.customCoverUrl = url;
    this.notifyState();
  }

  public setCustomVideoUrl(url: string | null) {
    this.customVideoUrl = url;
    this.notifyState();
  }

  /**
   * Decodes a local audio file into a TrackMetadata item (and optionally loads onto Deck A or B).
   */
  public async decodeAudioFileToTrack(file: File): Promise<TrackMetadata | null> {
    this.init();
    if (!this.ctx) return null;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    const customTrack: TrackMetadata = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Studio File',
      bpm: 96,
      duration: audioBuffer.duration,
      genre: 'Local Audio File',
      key: 'C Min',
      color: '#f59e0b',
      coverImage: this.customCoverUrl,
      buffer: audioBuffer,
      waveformData: this.extractWaveformData(audioBuffer, 160),
    };
    return customTrack;
  }

  public async loadCustomAudioFile(
    file: File,
    deckOrSlot: 'A' | 'B' | 'custom1' | 'custom2'
  ): Promise<TrackMetadata | null> {
    const track = await this.decodeAudioFileToTrack(file);
    if (track && (deckOrSlot === 'A' || deckOrSlot === 'B')) {
      track.color = deckOrSlot === 'A' ? '#ef4444' : '#3b82f6';
      this.loadTrack(deckOrSlot, track);
      return track;
    }
    return track;
  }

  public async loadGeneratedAudioDataUrl(
    dataUrl: string,
    title: string,
    deckId: 'A' | 'B',
    bpm = 96,
    coverUrl?: string
  ): Promise<TrackMetadata | null> {
    this.init();
    if (!this.ctx) return null;

    const response = await fetch(dataUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    const studioTrack: TrackMetadata = {
      id: `synth_${Date.now()}`,
      title: title || 'White Chocolate Stem',
      artist: 'White Chocolate Studio',
      bpm,
      duration: audioBuffer.duration,
      genre: 'Studio Custom Stem',
      key: 'D Min',
      color: deckId === 'A' ? '#ef4444' : '#3b82f6',
      coverImage: coverUrl || this.customCoverUrl,
      buffer: audioBuffer,
      waveformData: this.extractWaveformData(audioBuffer, 160),
    };

    this.loadTrack(deckId, studioTrack);
    return studioTrack;
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

  // ===========================================================================
  // LIVE STREAM MICROPHONE & TALKOVER
  // ===========================================================================
  public async toggleMicrophone() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.micActive) {
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
          autoGainControl: true,
        },
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
    this.voiceSamplerFx = effect;
    this.applyMicEffect(effect);
    this.notifyState();
  }

  private applyMicEffect(effect: MicVoiceEffect) {
    if (!this.micFilter || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (effect === 'radio') {
      this.micFilter.type = 'bandpass';
      this.micFilter.frequency.setValueAtTime(1400, now);
      this.micFilter.Q.setValueAtTime(2.5, now);
    } else if (effect === 'talkbox') {
      this.micFilter.type = 'bandpass';
      this.micFilter.frequency.setValueAtTime(950, now);
      this.micFilter.Q.setValueAtTime(5.0, now);
    } else if (effect === 'chopped') {
      this.micFilter.type = 'lowpass';
      this.micFilter.frequency.setValueAtTime(650, now);
      this.micFilter.Q.setValueAtTime(2.5, now);
    } else if (effect === 'robot') {
      this.micFilter.type = 'peaking';
      this.micFilter.frequency.setValueAtTime(440, now);
      this.micFilter.Q.setValueAtTime(12, now);
      this.micFilter.gain.setValueAtTime(15, now);
    } else {
      this.micFilter.type = 'highpass';
      this.micFilter.frequency.setValueAtTime(80, now);
      this.micFilter.Q.setValueAtTime(0.7, now);
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
    this.deckNodes.A.deckGain.gain.linearRampToValueAtTime(
      this.deckAState.volume * 0.32,
      this.ctx.currentTime + 0.08
    );
    this.deckNodes.B.deckGain.gain.linearRampToValueAtTime(
      this.deckBState.volume * 0.32,
      this.ctx.currentTime + 0.08
    );
  }

  private resetDucking() {
    if (!this.ctx || !this.deckNodes) return;
    this.deckNodes.A.deckGain.gain.linearRampToValueAtTime(
      this.deckAState.volume,
      this.ctx.currentTime + 0.25
    );
    this.deckNodes.B.deckGain.gain.linearRampToValueAtTime(
      this.deckBState.volume,
      this.ctx.currentTime + 0.25
    );
  }

  // ===========================================================================
  // MASTER SET RECORDING
  // ===========================================================================
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
    a.download = `White_Chocolate_Lowrider_Mix_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  public getBroadcastStream(): MediaStream | null {
    return this.streamDestination ? this.streamDestination.stream : null;
  }

  private startEngineLoop() {
    const tick = (timestamp: number) => {
      const deltaSec = (timestamp - this.lastTimestamp) / 1000 || 0.016;
      this.lastTimestamp = timestamp;

      this.updateDeckProgress('A', deltaSec);
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
      state.rotationAngle = (state.rotationAngle + deltaSec * 200 * speed) % 360;

      if (state.loop.active && state.track) {
        const beatSec = 60 / state.effectiveBpm;
        const loopDuration = state.loop.lengthBeats * beatSec;
        if (state.currentTime >= state.loop.startTime + loopDuration) {
          state.currentTime = state.loop.startTime;
          this.startBufferSource(deckId, state.currentTime);
        }
      }

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
