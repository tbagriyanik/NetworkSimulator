// pcAudioRender.ts
// Offline sample rendering and WAV encoding for the embedded Python audio
// engine. Kept free of Web Audio / DOM references so the exact same envelope
// and oscillator code can be unit-tested and reused by save_wav().

import type { TimedNote, WaveformType } from './pcAudioTheory';

/** Attack / decay / sustain / release shape, all in milliseconds except sustain. */
export interface Envelope {
  attackMs: number;
  decayMs: number;
  /** Held level as a fraction of the peak, 0-1. */
  sustain: number;
  releaseMs: number;
}

export const DEFAULT_ENVELOPE: Envelope = {
  attackMs: 12,
  decayMs: 70,
  sustain: 0.7,
  releaseMs: 110,
};

export interface RenderOptions {
  sampleRate?: number;
  waveform?: WaveformType;
  volume?: number;
  envelope?: Partial<Envelope>;
}

const DEFAULT_SAMPLE_RATE = 22050;
const TWO_PI = Math.PI * 2;

/** Clamped, non-negative duration helper that survives junk input. */
function positiveOr(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp01(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

/** Merges user-supplied envelope fields over the defaults, clamping each. */
export function resolveEnvelope(envelope: Partial<Envelope> | undefined): Envelope {
  return {
    attackMs: Math.min(4000, positiveOr(envelope?.attackMs, DEFAULT_ENVELOPE.attackMs)),
    decayMs: Math.min(8000, positiveOr(envelope?.decayMs, DEFAULT_ENVELOPE.decayMs)),
    sustain: clamp01(envelope?.sustain, DEFAULT_ENVELOPE.sustain),
    releaseMs: Math.min(8000, positiveOr(envelope?.releaseMs, DEFAULT_ENVELOPE.releaseMs)),
  };
}

/** Band-limited step correction (PolyBLEP) that removes most aliasing. */
function polyBlep(phase: number, dt: number): number {
  if (phase < dt) {
    const t = phase / dt;
    return t + t - t * t - 1;
  }
  if (phase > 1 - dt) {
    const t = (phase - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Deterministic noise source so exported renders are byte-for-byte stable. */
function createNoiseSource(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return (state / 0x40000000) - 1;
  };
}

/** One cycle of the requested waveform at the given normalised phase. */
function waveformSample(waveform: WaveformType, phase: number, dt: number, noise: () => number): number {
  switch (waveform) {
    case 'square': {
      const raw = phase < 0.5 ? 1 : -1;
      return raw + polyBlep(phase, dt) - polyBlep((phase + 0.5) % 1, dt);
    }
    case 'sawtooth':
      return 2 * phase - 1 - polyBlep(phase, dt);
    case 'triangle':
      return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
    case 'noise':
      return noise();
    case 'sine':
    default:
      return Math.sin(TWO_PI * phase);
  }
}

/**
 * Instantaneous envelope gain at `ms` into a note that is held for `holdMs`
 * and then faded out over releaseMs.
 */
export function envelopeGainAt(ms: number, holdMs: number, envelope: Envelope): number {
  const { attackMs, decayMs, sustain, releaseMs } = envelope;
  if (ms < 0) return 0;
  if (ms < attackMs) return attackMs > 0 ? ms / attackMs : 1;
  if (ms < attackMs + decayMs) {
    const progress = (ms - attackMs) / decayMs;
    return 1 - (1 - sustain) * progress;
  }
  const releaseStart = Math.max(attackMs + decayMs, holdMs);
  if (ms < releaseStart) return sustain;
  if (ms < releaseStart + releaseMs) {
    return sustain * (1 - (ms - releaseStart) / releaseMs);
  }
  return 0;
}

/** Soft limiter that keeps stacked voices inside the 16-bit range. */
function softClip(value: number): number {
  if (value > -0.8 && value < 0.8) return value;
  const sign = value < 0 ? -1 : 1;
  const overshoot = Math.abs(value) - 0.8;
  return sign * (0.8 + Math.tanh(overshoot * 2) * 0.19);
}

/**
 * Renders timed notes into a single mono float buffer, mixing overlapping
 * voices and soft-clipping the result.
 */
export function renderSequence(notes: TimedNote[], options: RenderOptions = {}): Float32Array {
  const sampleRate = Math.max(4000, Math.min(96000, Math.round(positiveOr(options.sampleRate, DEFAULT_SAMPLE_RATE))));
  const waveform: WaveformType = options.waveform ?? 'sine';
  const volume = clamp01(options.volume, 0.6);
  const envelope = resolveEnvelope(options.envelope);

  const sounding = notes.filter(note => note.frequency > 0 && note.durationMs > 0);
  if (sounding.length === 0) return new Float32Array(0);

  const totalMs = sounding.reduce(
    (max, note) => Math.max(max, note.startMs + note.durationMs + envelope.releaseMs),
    0,
  );
  const totalSamples = Math.max(1, Math.ceil((totalMs / 1000) * sampleRate));
  const buffer = new Float32Array(totalSamples);

  sounding.forEach((note, voiceIndex) => {
    const startSample = Math.round((note.startMs / 1000) * sampleRate);
    const holdSamples = Math.max(1, Math.round((note.durationMs / 1000) * sampleRate));
    const voiceSamples = holdSamples + Math.round((envelope.releaseMs / 1000) * sampleRate);
    const phaseStep = note.frequency / sampleRate;
    let phase = ((voiceIndex * 0.37) % 1); // decorrelate identical voices
    const noise = createNoiseSource(0x9e3779b9 + voiceIndex * 2654435761);
    const noiseDecay = 1 / Math.max(1, holdSamples * 0.35);

    for (let i = 0; i < voiceSamples; i++) {
      const index = startSample + i;
      if (index >= totalSamples) break;
      const gain = envelopeGainAt((i / sampleRate) * 1000, note.durationMs, envelope);
      if (gain <= 0) continue;
      let sample = waveformSample(waveform, phase, Math.min(0.5, phaseStep), noise);
      if (waveform === 'noise') {
        // Percussive noise: exponential decay on top of the shared envelope.
        sample *= Math.exp(-i * noiseDecay);
      } else {
        phase += phaseStep;
        if (phase >= 1) phase -= 1;
      }
      buffer[index] += sample * gain * volume;
    }
  });

  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = softClip(buffer[i]);
  }
  return buffer;
}

/**
 * Encodes mono float samples as a 16-bit PCM RIFF/WAVE byte array.
 * Header layout follows the canonical 44-byte layout.
 */
export function encodeWav(samples: Float32Array, sampleRate: number = DEFAULT_SAMPLE_RATE): Uint8Array {
  const rate = Math.max(1, Math.round(positiveOr(sampleRate, DEFAULT_SAMPLE_RATE)));
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, (rate * numChannels * bitsPerSample) / 8, true);
  view.setUint16(32, (numChannels * bitsPerSample) / 8, true);
  view.setUint16(34, bitsPerSample, true);

  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

// ── Decoding ─────────────────────────────────────────────────────────────────

export interface DecodedWav {
  sampleRate: number;
  /** One Float32Array per channel, normalised to -1..1, all of `frames` long. */
  channels: Float32Array[];
  frames: number;
  bitsPerSample: number;
  /** True for IEEE float payloads, false for integer PCM. */
  isFloat: boolean;
}

const WAVE_FORMAT_PCM = 1;
const WAVE_FORMAT_IEEE_FLOAT = 3;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;
/** Refuse absurd payloads rather than trying to allocate them. */
const MAX_DECODE_BYTES = 64 * 1024 * 1024;

function fourccAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
}

/** Reads one signed PCM sample of `bitsPerSample` width, little-endian. */
function readPcmSample(view: DataView, offset: number, bitsPerSample: number): number {
  if (bitsPerSample === 8) {
    // 8-bit WAV samples are unsigned with 128 as zero.
    return (view.getUint8(offset) - 128) / 128;
  }
  if (bitsPerSample === 16) return view.getInt16(offset, true) / 0x8000;
  if (bitsPerSample === 24) {
    const unsigned = view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
    // Sign-extend the assembled 24-bit word. Reading the low byte as signed
    // would be wrong: a negative sample usually has 0x00-0x7F there and the
    // sign only appears in the top bit of the third byte.
    const raw = unsigned >= 0x800000 ? unsigned - 0x1000000 : unsigned;
    return raw / 0x800000;
  }
  if (bitsPerSample === 32) return view.getInt32(offset, true) / 0x80000000;
  return 0;
}

function readFloatSample(view: DataView, offset: number, bitsPerSample: number): number {
  const value = bitsPerSample === 64 ? view.getFloat64(offset, true) : view.getFloat32(offset, true);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Decodes an uncompressed RIFF/WAVE payload into per-channel float buffers.
 *
 * Walks the chunk list rather than assuming the canonical 44-byte header, so
 * files carrying `LIST`, `fact` or extra `fmt ` fields still load. Supports
 * integer PCM at 8/16/24/32 bits and IEEE float at 32/64 bits, mono through
 * 8 channels. Returns null for anything that is not decodable PCM so callers
 * can report a clear error instead of playing noise.
 */
export function decodeWav(bytes: Uint8Array): DecodedWav | null {
  if (!bytes || bytes.length < 44 || bytes.length > MAX_DECODE_BYTES) return null;
  if (fourccAt(bytes, 0) !== 'RIFF' || fourccAt(bytes, 8) !== 'WAVE') return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let audioFormat = 0;
  let numChannels = 0;
  let sampleRate = 0;
  let blockAlign = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;

  // Chunk walk. Each chunk is an 8-byte header plus a body padded to an even
  // length, so odd-sized bodies carry a pad byte we must skip.
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = fourccAt(bytes, offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (size < 0 || body + size > bytes.length) break;

    if (id === 'fmt ' && size >= 16) {
      audioFormat = view.getUint16(body, true);
      numChannels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      blockAlign = view.getUint16(body + 12, true);
      bitsPerSample = view.getUint16(body + 14, true);
      // WAVE_FORMAT_EXTENSIBLE stores the real tag in the first two bytes of
      // its SubFormat GUID, which sits after cbSize, validBits and channelMask.
      if (audioFormat === WAVE_FORMAT_EXTENSIBLE && size >= 26) {
        audioFormat = view.getUint16(body + 24, true);
      }
    } else if (id === 'data') {
      dataOffset = body;
      dataSize = size;
    }

    offset = body + size + (size % 2);
  }

  const isFloat = audioFormat === WAVE_FORMAT_IEEE_FLOAT;
  if (dataOffset < 0) return null;
  if (audioFormat !== WAVE_FORMAT_PCM && !isFloat) return null;
  if (numChannels < 1 || numChannels > 8) return null;
  if (bitsPerSample !== 8 && bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
    if (!(isFloat && (bitsPerSample === 32 || bitsPerSample === 64))) return null;
  }

  const bytesPerSample = bitsPerSample / 8;
  const frameSize = blockAlign > 0 ? blockAlign : numChannels * bytesPerSample;
  if (frameSize <= 0) return null;
  const frames = Math.floor(dataSize / frameSize);
  if (frames <= 0) return null;

  const channels: Float32Array[] = [];
  for (let channel = 0; channel < numChannels; channel++) {
    channels.push(new Float32Array(frames));
  }

  for (let frame = 0; frame < frames; frame++) {
    const base = dataOffset + frame * frameSize;
    for (let channel = 0; channel < numChannels; channel++) {
      const sampleOffset = base + channel * bytesPerSample;
      const value = isFloat
        ? readFloatSample(view, sampleOffset, bitsPerSample)
        : readPcmSample(view, sampleOffset, bitsPerSample);
      channels[channel][frame] = Math.max(-1, Math.min(1, value));
    }
  }

  return {
    sampleRate: sampleRate > 0 ? sampleRate : DEFAULT_SAMPLE_RATE,
    channels,
    frames,
    bitsPerSample,
    isFloat,
  };
}

/** Descriptors of a decoded file, in the form `wav_info()` reports. */
export function describeWav(decoded: DecodedWav): string {
  const seconds = (decoded.frames / Math.max(1, decoded.sampleRate)).toFixed(2);
  const layout = decoded.channels.length === 1 ? 'mono' : `${decoded.channels.length}ch`;
  const kind = decoded.isFloat ? 'float' : 'pcm';
  return `${seconds}s, ${decoded.sampleRate} Hz, ${layout}, ${decoded.bitsPerSample}-bit ${kind}`;
}

/**
 * Converts bytes to a binary string in bounded chunks. A naive per-byte
 * `out += String.fromCharCode(...)` loop is quadratic in string length and
 * stalls the UI for anything longer than a few seconds of audio.
 */
export function bytesToBinaryString(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let result = '';
  for (let start = 0; start < bytes.length; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, bytes.length);
    const chunk = bytes.subarray(start, end);
    result += String.fromCharCode(...chunk);
  }
  return result;
}

/**
 * Inverse of `bytesToBinaryString`, used to recover the bytes of a binary file
 * (such as a saved WAV) from the virtual filesystem, where file content is
 * held as a string with one byte per character.
 */
export function binaryStringToBytes(content: string): Uint8Array {
  const length = content.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = content.charCodeAt(i) & 0xff;
  }
  return bytes;
}
