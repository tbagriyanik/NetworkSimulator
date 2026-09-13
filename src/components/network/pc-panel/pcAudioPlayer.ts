// pcAudioPlayer.ts
// Real-time Web Audio API synthesizer and WAV file generator for embedded Python audio engine

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

// Standard scientific pitch notation note frequencies (A4 = 440Hz)
const NOTE_SEMITONES: Record<string, number> = {
  C: -9, 'C#': -8, Db: -8,
  D: -7, 'D#': -6, Eb: -6,
  E: -5,
  F: -4, 'F#': -3, Gb: -3,
  G: -2, 'G#': -1, Ab: -1,
  A: 0,  'A#': 1,  Bb: 1,
  B: 2,
};

export function noteToFrequency(noteStr: string): number {
  const trimmed = noteStr.trim().toUpperCase();
  if (trimmed === 'REST' || trimmed === 'R' || trimmed === '0' || trimmed === '-') return 0;

  const match = /^([A-G][#B]?)(-?\d+)$/.exec(trimmed);
  if (!match) {
    const num = parseFloat(noteStr);
    return isNaN(num) ? 440 : num;
  }

  const [, key, octStr] = match;
  const octave = parseInt(octStr, 10);
  const semitoneOffset = NOTE_SEMITONES[key] ?? 0;
  // A4 is 440 Hz at octave 4
  const n = semitoneOffset + (octave - 4) * 12;
  return 440 * Math.pow(2, n / 12);
}

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private activeSources: Set<AudioNode> = new Set();
  private masterGain: GainNode | null = null;
  private isMuted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playTone(
    freq: number,
    durationMs: number,
    waveform: WaveformType = 'sine',
    volume = 0.5,
    attackMs = 15,
    releaseMs = 30
  ): Promise<void> {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || freq <= 0) {
      return new Promise(res => setTimeout(res, durationMs));
    }

    return new Promise(resolve => {
      const startTime = (ctx && typeof ctx.currentTime === 'number' && isFinite(ctx.currentTime)) ? ctx.currentTime : 0;
      const safeDurationMs = (typeof durationMs === 'number' && isFinite(durationMs)) ? Math.max(10, durationMs) : 250;
      const durationSec = Math.max(0.02, safeDurationMs / 1000);
      const attackSec = attackMs / 1000;
      const releaseSec = releaseMs / 1000;
      const stopTime = startTime + durationSec;
      const targetVol = (typeof volume === 'number' && isFinite(volume)) ? Math.min(1, Math.max(0, volume)) : 0.5;

      const gain = ctx.createGain();
      try {
        gain.gain.setValueAtTime(0, startTime);
      } catch { }

      const ramp1Time = startTime + Math.min(attackSec, durationSec * 0.5);
      const holdTime = Math.max(startTime, stopTime - releaseSec);

      try {
        if (isFinite(ramp1Time)) gain.gain.linearRampToValueAtTime(targetVol, ramp1Time);
      } catch {
        try { gain.gain.setValueAtTime(targetVol, startTime); } catch { }
      }

      try {
        if (isFinite(holdTime)) gain.gain.setValueAtTime(targetVol, holdTime);
      } catch { }

      try {
        if (isFinite(stopTime)) gain.gain.linearRampToValueAtTime(0.0001, stopTime);
      } catch { }

      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(ctx.destination);
      }

      if (waveform === 'noise') {
        // White noise generator for percussive snare / hi-hat
        const bufferSize = ctx.sampleRate * durationSec;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.connect(gain);
        noise.start(startTime);
        noise.stop(stopTime);
        this.activeSources.add(noise);
        noise.onended = () => {
          this.activeSources.delete(noise);
          gain.disconnect();
          resolve();
        };
      } else {
        const osc = ctx.createOscillator();
        osc.type = waveform;
        osc.frequency.setValueAtTime(freq, startTime);
        osc.connect(gain);
        osc.start(startTime);
        osc.stop(stopTime);
        this.activeSources.add(osc);
        osc.onended = () => {
          this.activeSources.delete(osc);
          gain.disconnect();
          resolve();
        };
      }
    });
  }

  public playChord(
    notesOrFreqs: (string | number)[],
    durationMs: number,
    waveform: WaveformType = 'sine',
    volume = 0.5
  ): Promise<void> {
    const promises = notesOrFreqs.map(nf => {
      const f = typeof nf === 'string' ? noteToFrequency(nf) : Number(nf);
      return this.playTone(f, durationMs, waveform, volume / Math.sqrt(notesOrFreqs.length));
    });
    return Promise.all(promises).then(() => {});
  }

  private activeTimers: Set<ReturnType<typeof setTimeout>> = new Set();

  public scheduleTimeout(fn: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      fn();
    }, delayMs);
    this.activeTimers.add(timerId);
    return timerId;
  }

  public stopAll(): void {
    this.activeTimers.forEach(id => clearTimeout(id));
    this.activeTimers.clear();
    this.activeSources.forEach(src => {
      try {
        if ('stop' in src && typeof src.stop === 'function') src.stop();
      } catch { /* already stopped */ }
    });
    this.activeSources.clear();
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.min(1, Math.max(0, vol)), this.ctx.currentTime);
    }
  }

  public playPresetSoundEffect(name: string): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return Promise.resolve();

    const lower = name.toLowerCase();
    if (lower === 'coin' || lower === 'pickup') {
      return this.playTone(987.77, 80, 'sine', 0.4) // B5
        .then(() => this.playTone(1318.51, 240, 'sine', 0.5)); // E6
    }
    if (lower === 'laser' || lower === 'shoot') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      return new Promise(res => { osc.onended = () => res(); });
    }
    if (lower === 'jump') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      return new Promise(res => { osc.onended = () => res(); });
    }
    if (lower === 'explosion' || lower === 'hit') {
      return this.playTone(80, 400, 'noise', 0.8, 10, 300);
    }
    if (lower === 'powerup') {
      return this.playTone(330, 80, 'triangle', 0.4)
        .then(() => this.playTone(392, 80, 'triangle', 0.4))
        .then(() => this.playTone(523, 80, 'triangle', 0.4))
        .then(() => this.playTone(659, 160, 'triangle', 0.5));
    }
    return this.playTone(440, 150, 'sine', 0.5);
  }
}

export const audioEngine = new WebAudioEngine();

/**
 * Generates an in-memory WAV byte array string (base64 or binary) for export
 */
export function generateWavFile(
  samples: Float32Array,
  sampleRate = 22050
): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio samples (16-bit signed integer)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}
