/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Quick Mic Voice Sampler Modal & FX Button Assign
 * High-Fidelity Lossless Audio Recording with Zero Choppiness (WAV PCM + Direct Web Audio)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Check, Sparkles, X, Volume2, Save, Activity } from 'lucide-react';
import { DJEngine } from '../audio/DJEngine';
import { studioStorage, RecordedVoiceClip } from '../storage/studioStorage';

interface VoiceSamplerModalProps {
  engine: DJEngine;
  isOpen: boolean;
  onClose: () => void;
  onClipSaved?: (clip: RecordedVoiceClip) => void;
  savedClips: RecordedVoiceClip[];
  onRefreshClips: () => void;
}

const PRESET_LABELS = [
  "YO IT'S WHITE CHOCOLATE!",
  "DROP THE BASS!",
  "SHEEEESH!",
  "SPAM THE LIKES!",
  "LET'S GOOO!",
  "DOUBLE TAP SCREEN!",
];

const PASTEL_PAD_COLORS = [
  { name: 'Candy Red', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50' },
  { name: 'Lowrider Gold', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  { name: 'West Coast Mint', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  { name: 'Cobalt Blue', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
  { name: 'Purple Haze', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
];

/**
 * Encodes Float32Array PCM audio into a standard 16-bit uncompressed RIFF WAV Blob.
 * Eliminates all WebM container chunk-stitching gaps and encoding choppiness.
 */
function encodeWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF Header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');

  // 2. "fmt " Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 for mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (sampleRate * 1 channel * 2 bytes)
  view.setUint16(32, 2, true); // BlockAlign (1 channel * 2 bytes)
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // 3. "data" Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // 4. Write 16-bit signed integer PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const VoiceSamplerModal: React.FC<VoiceSamplerModalProps> = ({
  engine,
  isOpen,
  onClose,
  onClipSaved,
  savedClips,
  onRefreshClips,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [clipName, setClipName] = useState("YO IT'S WHITE CHOCOLATE!");
  const [selectedColor, setSelectedColor] = useState(PASTEL_PAD_COLORS[0].bg);
  const [targetSlot, setTargetSlot] = useState<string>('slot1');
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  // Audio references
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const cleanupAudio = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicLevel(0);
  };

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      cleanupAudio();
      setMicError(null);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioBlob(null);
      setRecordSeconds(0);
      pcmChunksRef.current = [];

      // Constraint tuning for DJ vocals / shouts:
      // Turn off browser noise-suppression and AGC ducking which cause "choppy" stuttering on vocal spikes
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
          },
        });
      } catch {
        // Fallback to basic audio constraint if strict constraints rejected
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const actx = new AudioCtx();
      audioContextRef.current = actx;

      if (actx.state === 'suspended') {
        await actx.resume();
      }

      const sampleRate = actx.sampleRate;
      const source = actx.createMediaStreamSource(stream);

      // Metering Analyser Node
      const analyser = actx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const pcmData = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(pcmData);
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) sum += pcmData[i];
        setMicLevel(Math.min(100, Math.round((sum / pcmData.length / 255) * 150)));
        animRef.current = requestAnimationFrame(updateMeter);
      };
      animRef.current = requestAnimationFrame(updateMeter);

      // Direct Lossless PCM Stream Capture via ScriptProcessorNode
      // This bypasses compressed WebM chunk stitching and guarantees 100% continuous, unfragmented audio
      const bufferSize = 4096;
      const processor = actx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        // Copy audio samples to avoid buffer recycling
        const chunk = new Float32Array(inputBuffer.length);
        chunk.set(inputBuffer);
        pcmChunksRef.current.push(chunk);
      };

      source.connect(processor);
      // Connect to destination via silent dummy gain so Web Audio processes the node
      const dummyGain = actx.createGain();
      dummyGain.gain.setValueAtTime(0, actx.currentTime);
      processor.connect(dummyGain);
      dummyGain.connect(actx.destination);

      setIsRecording(true);

      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordSeconds(parseFloat(elapsed.toFixed(1)));
        if (elapsed >= 10) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      console.warn('Microphone recording error:', err);
      setMicError('Microphone access is required to record voice clips. Please enable mic permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const chunks = pcmChunksRef.current;
    const actx = audioContextRef.current;
    const sampleRate = actx ? actx.sampleRate : 44100;

    // Disconnect audio processors
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Merge all collected PCM chunks into one contiguous Float32Array
    let totalSamples = 0;
    for (let i = 0; i < chunks.length; i++) {
      totalSamples += chunks[i].length;
    }

    if (totalSamples > 0) {
      const mergedPcm = new Float32Array(totalSamples);
      let offset = 0;
      for (let i = 0; i < chunks.length; i++) {
        mergedPcm.set(chunks[i], offset);
        offset += chunks[i].length;
      }

      // Encode into pristine, broadcast-ready lossless 16-bit RIFF WAV
      const wavBlob = encodeWavBlob(mergedPcm, sampleRate);
      setAudioBlob(wavBlob);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);

      const duration = Math.max(0.5, totalSamples / sampleRate);
      setRecordSeconds(parseFloat(duration.toFixed(1)));
    }

    setMicLevel(0);
  };

  const playPreview = () => {
    if (!audioBlob) return;
    // Invalidate stale buffer and force clean playback of new recording
    const previewId = `preview_${Date.now()}`;
    engine.playCustomVoiceClip(previewId, audioBlob, true);
  };

  const saveClip = async () => {
    if (!audioBlob) return;

    const newClip: RecordedVoiceClip = {
      id: `clip_${Date.now()}`,
      name: clipName.trim() || 'My Voice FX',
      blob: audioBlob,
      duration: Math.max(0.5, recordSeconds),
      createdAt: Date.now(),
      color: selectedColor,
      assignedPad: targetSlot,
    };

    // Save to persistent IndexedDB File Store
    await studioStorage.saveAudioClip(newClip);

    // Update session state for quick FX button
    const session = await studioStorage.loadSession();
    const currentSlots = session?.mixerQuickFX || {
      slot1: 'vine_boom',
      slot2: 'bruh',
      slot3: 'emotional_damage',
      slot4: 'oh_no',
      slot5: 'ding_levelup',
      slot6: 'crowd_cheer',
    };

    if (targetSlot) {
      await studioStorage.saveSession({
        mixerQuickFX: {
          ...currentSlots,
          [targetSlot]: newClip.id,
        },
      });
    }

    onRefreshClips();
    if (onClipSaved) onClipSaved(newClip);

    // Reset current record state
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordSeconds(0);
  };

  const deleteClip = async (id: string) => {
    engine.invalidateVoiceClip(id);
    await studioStorage.deleteAudioClip(id);
    onRefreshClips();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-4 sm:p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>QUICK MIC SAMPLER</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                  LOSSLESS WAV
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pristine voice shouts & drops mapped directly to Mixer FX buttons
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-4 py-3 flex-1 pr-1">
          {/* Live Recording Console */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center text-center">
            {/* VU Meter & Timer */}
            <div className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                <span>MIC LEVEL</span>
              </span>
              <span className="text-rose-400 text-sm font-bold">
                {isRecording ? `${recordSeconds.toFixed(1)}s / 10s` : audioBlob ? `${recordSeconds.toFixed(1)}s (Pristine WAV)` : '0.0s'}
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 mb-4 border border-slate-800">
              <div
                className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
                style={{ width: `${isRecording ? micLevel : 0}%` }}
              />
            </div>

            {/* Error Notification */}
            {micError && (
              <div className="w-full mb-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-semibold text-center">
                {micError}
              </div>
            )}

            {/* Big Record Button */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-900/40 flex items-center gap-2 active:scale-95 transition-all min-h-[48px]"
              >
                <Mic className="w-5 h-5 animate-pulse" />
                <span>RECORD VOICE CLIP (TAP TO TALK)</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm tracking-wide shadow-lg flex items-center gap-2 active:scale-95 transition-all min-h-[48px] animate-pulse"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>STOP RECORDING ({recordSeconds.toFixed(1)}s)</span>
              </button>
            )}

            {/* Quick Presets for Clip Titles */}
            <div className="w-full mt-4 pt-3 border-t border-slate-850">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-left">
                DJ Shout Catchphrases
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_LABELS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setClipName(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Config & Assign Controls for recorded clip */}
          {audioBlob && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>RECORDED (NO CHOPPINESS · 16-BIT WAV)</span>
                </span>
                <button
                  onClick={playPreview}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors min-h-[36px]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Preview Audio</span>
                </button>
              </div>

              {/* Clip Title Input */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Clip Title / Shoutout Name
                </label>
                <input
                  type="text"
                  value={clipName}
                  onChange={(e) => setClipName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-rose-500 text-white"
                  placeholder="e.g. YO IT'S WHITE CHOCOLATE!"
                />
              </div>

              {/* Target Slot Assignment */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">
                    Map to Mixer FX Button
                  </label>
                  <select
                    value={targetSlot}
                    onChange={(e) => setTargetSlot(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="slot1">Mixer FX Pad 1</option>
                    <option value="slot2">Mixer FX Pad 2</option>
                    <option value="slot3">Mixer FX Pad 3</option>
                    <option value="slot4">Mixer FX Pad 4</option>
                    <option value="slot5">Mixer FX Pad 5</option>
                    <option value="slot6">Mixer FX Pad 6</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">
                    Pad Color
                  </label>
                  <div className="flex gap-1.5 mt-1">
                    {PASTEL_PAD_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c.bg)}
                        title={c.name}
                        className={`w-7 h-7 rounded-lg border ${c.bg} ${
                          selectedColor === c.bg ? 'ring-2 ring-white scale-105' : 'opacity-70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveClip}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs tracking-wider shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Save className="w-4 h-4" />
                <span>SAVE TO FILE STORE & ASSIGN TO MIXER</span>
              </button>
            </div>
          )}

          {/* List of Saved Audio Clips in File Store */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>File Store: Saved Custom Voice Clips ({savedClips.length})</span>
              </span>
            </div>

            {savedClips.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                No custom voice recordings yet. Tap the record button above to record your voice!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shadow-sm flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => engine.playCustomVoiceClip(clip.id, clip.blob)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0 transition-transform active:scale-95 ${clip.color || 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}
                        title="Trigger Clip"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">
                          {clip.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {clip.duration.toFixed(1)}s · {clip.assignedPad ? `Assigned to ${clip.assignedPad}` : 'Soundboard'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => deleteClip(clip.id)}
                        className="w-7 h-7 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                        title="Delete from File Store"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Persists automatically in browser storage (IndexedDB)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
