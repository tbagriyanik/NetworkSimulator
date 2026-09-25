// pcAudioPlayer.ts
// Real-time Web Audio API synthesizer and WAV generator for the embedded
// Python audio engine.
//
// Design notes:
//   - All sequencing is scheduled against the AudioContext clock instead of
//     chained setTimeout() calls, so fast tempos stay sample-accurate and do
//     not drift the way timer-based scheduling does.
//   - The voice pool is bounded and steals the oldest voice, so a runaway
//     script cannot pile up hundreds of oscillator nodes.
//   - Every public argument is sanitised here, so malformed values degrade to
//     a documented default instead of turning into NaN (which the Web Audio
//     API silently turns into a silent node).

import { resolveEnvelope, type Envelope } from './pcAudioRender';
import { WAVEFORM_TYPES, noteToFrequency, type TimedNote, type WaveformType } from './pcAudioTheory';

export { noteToFrequency } from './pcAudioTheory';
export { encodeWav as generateWavFile } from './pcAudioRender';
export type { WaveformType, TimedNote, Envelope };

/** Coerces anything to a finite number, falling back when it is junk. */
function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Coerces to a finite number inside [min, max], falling back when out of range. */
function toClamped(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = toNumber(value, fallback);
  return Math.min(max, Math.max(min, parsed));
}

function toDuration(value: unknown, fallback = 250): number {
  return toClamped(value, 10, 120_000, fallback);
}

/** Normalises a waveform argument, falling back instead of trusting a typo. */
export function toWaveform(value: unknown, fallback: WaveformType = 'sine'): WaveformType {
  const text = String(value ?? '').trim().toLowerCase();
  return (WAVEFORM_TYPES as readonly string[]).includes(text) ? (text as WaveformType) : fallback;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
}

export interface ToneRequest {
  frequency: number;
  durationMs: number;
  waveform?: WaveformType;
  volume?: number;
  envelope?: Partial<Envelope>;
  /** Delay before the note starts, measured against the audio clock. */
  atOffsetMs?: number;
  /** Target frequency for a glide, e.g. a falling laser sweep. */
  glideTo?: number;
  /** Stereo position: -1 hard left, 0 centre, 1 hard right. */
  pan?: number;
  vibratoHz?: number;
  vibratoCents?: number;
}

export interface SequenceRequest {
  waveform?: WaveformType;
  volume?: number;
  envelope?: Partial<Envelope>;
  atOffsetMs?: number;
  pan?: number;
}

interface ActiveVoice {
  source: AudioScheduledSourceNode;
  gain: GainNode;
}

const MAX_VOICES = 24;
const MASTER_GAIN = 0.7;
/** Fallback buffer rate when a decoded file reports an unusable sample rate. */
const DEFAULT_BUFFER_RATE = 44100;
const MAX_NOISE_BUFFER_SECONDS = 2;

/** One playable sound effect, expressed as a list of sequential steps. */
interface SfxStep {
  frequency: number;
  durationMs: number;
  waveform?: WaveformType;
  volume?: number;
  glideTo?: number;
}

const SFX_PRESETS: Record<string, SfxStep[]> = {
  coin: [
    { frequency: 987.77, durationMs: 70, waveform: 'sine', volume: 0.35 },
    { frequency: 1318.51, durationMs: 220, waveform: 'sine', volume: 0.5 },
  ],
  pickup: [{ frequency: 880, durationMs: 60, waveform: 'triangle' }, { frequency: 1174.66, durationMs: 120, waveform: 'triangle' }],
  laser: [{ frequency: 880, durationMs: 150, waveform: 'sawtooth', volume: 0.5, glideTo: 110 }],
  shoot: [{ frequency: 660, durationMs: 120, waveform: 'square', volume: 0.45, glideTo: 160 }],
  jump: [{ frequency: 150, durationMs: 150, waveform: 'square', volume: 0.4, glideTo: 600 }],
  explosion: [{ frequency: 80, durationMs: 400, waveform: 'noise', volume: 0.8 }],
  hit: [{ frequency: 140, durationMs: 220, waveform: 'noise', volume: 0.6 }],
  whoosh: [{ frequency: 300, durationMs: 260, waveform: 'noise', volume: 0.45, glideTo: 900 }],
  powerup: [
    { frequency: 330, durationMs: 70, waveform: 'triangle', volume: 0.4 },
    { frequency: 392, durationMs: 70, waveform: 'triangle', volume: 0.4 },
    { frequency: 523.25, durationMs: 70, waveform: 'triangle', volume: 0.4 },
    { frequency: 659.25, durationMs: 160, waveform: 'triangle', volume: 0.5 },
  ],
  powerdown: [
    { frequency: 659.25, durationMs: 70, waveform: 'triangle', volume: 0.45 },
    { frequency: 523.25, durationMs: 70, waveform: 'triangle', volume: 0.45 },
    { frequency: 392, durationMs: 70, waveform: 'triangle', volume: 0.45 },
    { frequency: 329.63, durationMs: 170, waveform: 'triangle', volume: 0.5 },
  ],
  blip: [{ frequency: 1200, durationMs: 45, waveform: 'square', volume: 0.3 }],
  select: [{ frequency: 700, durationMs: 50, waveform: 'triangle', volume: 0.35 }, { frequency: 1050, durationMs: 70, waveform: 'triangle', volume: 0.35 }],
  click: [{ frequency: 2000, durationMs: 18, waveform: 'square', volume: 0.22 }],
  ding: [{ frequency: 1046.5, durationMs: 420, waveform: 'sine', volume: 0.45 }],
  error: [
    { frequency: 220, durationMs: 130, waveform: 'square', volume: 0.4 },
    { frequency: 165, durationMs: 220, waveform: 'square', volume: 0.4 },
  ],
  alarm: [
    { frequency: 880, durationMs: 160, waveform: 'square', volume: 0.4 },
    { frequency: 660, durationMs: 160, waveform: 'square', volume: 0.4 },
  ],
  siren: [{ frequency: 700, durationMs: 700, waveform: 'sine', volume: 0.45, glideTo: 1400 }],
  beep: [{ frequency: 440, durationMs: 150, waveform: 'sine', volume: 0.5 }],
};

/** Names of every available sound effect preset. */
export function listSoundEffectNames(): string[] {
  return Object.keys(SFX_PRESETS);
}

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private voices: ActiveVoice[] = [];
  private isMuted = false;
  private masterVolume = MASTER_GAIN;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        this.ctx = new AudioContextClass();
      } catch {
        this.ctx = null;
        return null;
      }
      // master -> limiter -> destination. The limiter keeps dense chords and
      // progressions from clipping once several voices stack up.
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      try {
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-10, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);
        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
      } catch {
        this.limiter = null;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** Number of voices currently sounding, exposed for diagnostics. */
  public get activeVoiceCount(): number {
    return this.voices.length;
  }

  public get muted(): boolean {
    return this.isMuted;
  }

  private releaseVoice(voice: ActiveVoice): void {
    const index = this.voices.indexOf(voice);
    if (index >= 0) this.voices.splice(index, 1);
    try {
      voice.gain.disconnect();
    } catch {
      // Already disconnected.
    }
  }

  /** Stops the oldest sounding voice so the pool stays bounded. */
  private stealVoice(): void {
    const oldest = this.voices.shift();
    if (!oldest) return;
    try {
      oldest.source.stop();
    } catch {
      // Already stopped.
    }
    try {
      oldest.gain.disconnect();
    } catch {
      // Already disconnected.
    }
  }

  private connectVoiceOutput(gain: GainNode, pan: number): void {
    if (!this.masterGain) return;
    let tail: AudioNode = this.masterGain;
    if (pan !== 0 && typeof this.ctx?.createStereoPanner === 'function') {
      try {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(toClamped(pan, -1, 1, 0), this.ctx!.currentTime);
        gain.connect(panner);
        tail = panner;
      } catch {
        tail = this.masterGain;
      }
    }
    gain.connect(tail);
  }

  /**
   * Plays a single note. Resolves once the note has finished sounding, or
   * after an equivalent delay when the context is unavailable or muted so
   * that callers keep a consistent sense of elapsed time.
   */
  public playTone(request: ToneRequest): Promise<void> {
    const frequency = toNumber(request.frequency, 0);
    const durationMs = toDuration(request.durationMs, 250);
    const atOffsetMs = toClamped(request.atOffsetMs, 0, 3_600_000, 0);
    const ctx = this.getContext();

    if (!ctx || this.isMuted || frequency <= 0) {
      return delay(atOffsetMs + durationMs);
    }

    const waveform = toWaveform(request.waveform, 'sine');
    const peak = toClamped(request.volume, 0, 1, 0.5);
    const envelope = resolveEnvelope(request.envelope);

    while (this.voices.length >= MAX_VOICES) {
      this.stealVoice();
    }

    return new Promise<void>(resolve => {
      const startTime = ctx.currentTime + atOffsetMs / 1000;
      const holdSeconds = Math.max(0.01, durationMs / 1000);
      const attack = Math.min(envelope.attackMs / 1000, holdSeconds * 0.5);
      const decay = Math.min(envelope.decayMs / 1000, Math.max(0, holdSeconds - attack));
      const release = Math.min(envelope.releaseMs / 1000, Math.max(0.05, holdSeconds));
      const decayEnd = startTime + attack + decay;
      const releaseStart = Math.max(decayEnd, startTime + holdSeconds);
      const stopTime = releaseStart + release;

      const gain = ctx.createGain();
      const sustainLevel = peak * envelope.sustain;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(peak, startTime + attack);
      gain.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
      gain.gain.setValueAtTime(sustainLevel, releaseStart);
      gain.gain.linearRampToValueAtTime(0, stopTime);
      this.connectVoiceOutput(gain, toNumber(request.pan, 0));

      const glideTo = toNumber(request.glideTo, 0);
      let source: AudioScheduledSourceNode;

      if (waveform === 'noise') {
        const seconds = Math.min(holdSeconds + release, MAX_NOISE_BUFFER_SECONDS);
        const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
        const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = seconds < holdSeconds + release;
        source = noise;
      } else {
        const oscillator = ctx.createOscillator();
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        if (glideTo > 0) {
          oscillator.frequency.exponentialRampToValueAtTime(glideTo, stopTime);
        }
        source = oscillator;

        const vibratoHz = toNumber(request.vibratoHz, 0);
        const vibratoCents = toNumber(request.vibratoCents, 0);
        if (vibratoHz > 0 && vibratoCents !== 0) {
          try {
            const lfo = ctx.createOscillator();
            const lfoDepth = ctx.createGain();
            lfo.frequency.setValueAtTime(vibratoHz, startTime);
            lfoDepth.gain.setValueAtTime(vibratoCents, startTime);
            lfo.connect(lfoDepth);
            lfoDepth.connect(oscillator.detune);
            lfo.start(startTime);
            lfo.stop(stopTime);
            lfo.onended = () => {
              try {
                lfoDepth.disconnect();
              } catch {
                // Already disconnected.
              }
            };
          } catch {
            // Vibrato is decorative; ignore it when unsupported.
          }
        }
      }

      source.connect(gain);
      source.start(startTime);
      source.stop(stopTime);

      const voice: ActiveVoice = { source, gain };
      this.voices.push(voice);
      // Resolve on the natural end of the note, and again from a safety timer
      // in case onended never fires because the context was closed mid-note.
      // A promise ignores the second settle, so this is safe.
      const finish = () => {
        this.releaseVoice(voice);
        resolve();
      };
      source.onended = finish;
      setTimeout(finish, Math.max(0, (stopTime - ctx.currentTime) * 1000) + 250);
    });
  }

  /**
   * Schedules a whole timeline of notes against the audio clock.
   * Overlapping entries (chords, sustained voices) mix as expected.
   */
  public playSequence(notes: TimedNote[], request: SequenceRequest = {}): Promise<void> {
    const baseOffset = toClamped(request.atOffsetMs, 0, 3_600_000, 0);
    const pending = notes
      .filter(note => note.frequency > 0)
      .map(note => this.playTone({
        frequency: note.frequency,
        durationMs: note.durationMs,
        waveform: request.waveform,
        volume: request.volume,
        envelope: request.envelope,
        pan: request.pan,
        atOffsetMs: baseOffset + toNumber(note.startMs, 0),
      }));
    return pending.length > 0 ? Promise.all(pending).then(() => undefined) : Promise.resolve();
  }

  /**
   * Plays a set of notes or frequencies simultaneously.
   * Volume is scaled by sqrt(voiceCount) so chords keep a stable loudness.
   */
  public playChord(
    notesOrFreqs: (string | number)[],
    durationMs: number,
    waveform: WaveformType = 'sine',
    volume = 0.5,
    envelope?: Partial<Envelope>,
  ): Promise<void> {
    const entries = Array.isArray(notesOrFreqs) ? notesOrFreqs : [notesOrFreqs];
    const scaled = toClamped(volume, 0, 1, 0.5) / Math.sqrt(Math.max(1, entries.length));
    const events: TimedNote[] = entries.map(entry => ({
      frequency: typeof entry === 'string' ? noteToFrequency(entry) : toNumber(entry, 0),
      startMs: 0,
      durationMs: toDuration(durationMs, 600),
    }));
    return this.playSequence(events, { waveform, volume: scaled, envelope });
  }

  /**
   * Plays pre-decoded sample data (a WAV loaded from the virtual disk).
   *
   * AudioBufferSourceNode resamples automatically when the file's rate differs
   * from the context, so the buffer is built at its native rate. The voice
   * still occupies a slot in the shared pool and is cut off by stopAll().
   */
  public playBuffer(
    channels: Float32Array[],
    sampleRate: number,
    request: { volume?: number; atOffsetMs?: number } = {},
  ): Promise<void> {
    const usable = channels.filter(channel => channel && channel.length > 0);
    if (usable.length === 0) return Promise.resolve();

    const atOffsetMs = toClamped(request.atOffsetMs, 0, 3_600_000, 0);
    // The spec requires the buffer rate to sit in a nominal range; clamp rather
    // than let createBuffer throw and lose the file entirely.
    const rate = Math.round(toClamped(sampleRate, 8000, 384000, DEFAULT_BUFFER_RATE));
    const frames = Math.min(...usable.map(channel => channel.length));

    const ctx = this.getContext();
    if (!ctx || this.isMuted) {
      return delay(atOffsetMs + (frames / rate) * 1000);
    }

    return new Promise<void>(resolve => {
      let buffer: AudioBuffer;
      try {
        buffer = ctx.createBuffer(usable.length, frames, rate);
        usable.forEach((channel, index) => buffer.getChannelData(index).set(channel.subarray(0, frames)));
      } catch {
        resolve();
        return;
      }

      while (this.voices.length >= MAX_VOICES) {
        this.stealVoice();
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(toClamped(request.volume, 0, 1, 1), ctx.currentTime);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      this.connectVoiceOutput(gain, 0);

      const voice: ActiveVoice = { source, gain };
      this.voices.push(voice);

      const startTime = ctx.currentTime + atOffsetMs / 1000;
      source.start(startTime);
      const endTime = startTime + frames / rate;
      const finish = () => {
        this.releaseVoice(voice);
        resolve();
      };
      source.onended = finish;
      setTimeout(finish, Math.max(0, (endTime - ctx.currentTime) * 1000) + 250);
    });
  }

  public stopAll(): void {
    this.voices.forEach(voice => {
      try {
        voice.source.stop();
      } catch {
        // Already stopped.
      }
    });
    this.voices = [];
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = toClamped(volume, 0, 1, MASTER_GAIN);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public mute(): void {
    this.isMuted = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public unmute(): void {
    this.isMuted = false;
    this.setMasterVolume(this.masterVolume);
  }

  /**
   * Plays a named sound effect. Unknown names fall back to a neutral beep so
   * scripts always get feedback instead of silence.
   */
  public playPresetSoundEffect(name: string, volume = 0.8): Promise<void> {
    const steps = SFX_PRESETS[String(name ?? '').trim().toLowerCase()] ?? SFX_PRESETS.beep;
    const scale = toClamped(volume, 0, 1, 0.8);
    let offsetMs = 0;
    const pending = steps.map(step => {
      const durationMs = toDuration(step.durationMs, 150);
      const promise = this.playTone({
        frequency: step.frequency,
        durationMs,
        waveform: step.waveform,
        volume: toClamped((step.volume ?? 0.5) * scale, 0, 1, 0.4),
        glideTo: step.glideTo,
        atOffsetMs: offsetMs,
      });
      offsetMs += durationMs;
      return promise;
    });
    return Promise.all(pending).then(() => undefined);
  }
}

export const audioEngine = new WebAudioEngine();
