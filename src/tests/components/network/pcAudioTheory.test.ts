import { describe, expect, it } from 'vitest';
import {
  chordNotes,
  expandToFrequencies,
  isRestToken,
  listScaleNames,
  noteToFrequency,
  parseChordProgression,
  parseNoteSequence,
  resolveScaleName,
  scaleNotes,
  sequenceLengthMs,
} from '@/components/network/pc-panel/pcAudioTheory';
import {
  binaryStringToBytes,
  bytesToBinaryString,
  decodeWav,
  describeWav,
  encodeWav,
  envelopeGainAt,
  renderSequence,
  resolveEnvelope,
  DEFAULT_ENVELOPE,
} from '@/components/network/pc-panel/pcAudioRender';

const near = (actual: number, expected: number, tolerance = 0.5) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

describe('noteToFrequency', () => {
  it('maps scientific pitch notation to standard frequencies', () => {
    expect(noteToFrequency('A4')).toBe(440);
    near(noteToFrequency('C4'), 261.63);
    near(noteToFrequency('C5'), 523.25);
    near(noteToFrequency('E4'), 329.63);
    near(noteToFrequency('G3'), 196.0);
  });

  it('supports sharps, flats and negative octaves', () => {
    near(noteToFrequency('C#4'), 277.18);
    near(noteToFrequency('Db4'), 277.18);
    near(noteToFrequency('Bb3'), 233.08);
    near(noteToFrequency('C-1'), 8.18, 0.05);
  });

  it('defaults a bare pitch class to octave 4', () => {
    near(noteToFrequency('C'), 261.63);
    near(noteToFrequency('A'), 440);
  });

  it('supports cent offsets for microtonal pitches', () => {
    near(noteToFrequency('A4+50'), 452.9, 0.2);
    near(noteToFrequency('A4-50'), 427.5, 0.2);
  });

  it('accepts plain numbers and Hz-suffixed rates', () => {
    expect(noteToFrequency(440)).toBe(440);
    near(noteToFrequency('440Hz'), 440, 0.01);
    near(noteToFrequency('1.5kHz'), 1500, 1);
  });

  it('returns silence for rests and unresolvable input', () => {
    expect(noteToFrequency('REST')).toBe(0);
    expect(noteToFrequency('rest')).toBe(0);
    expect(noteToFrequency('0')).toBe(0);
    expect(noteToFrequency('-')).toBe(0);
    expect(noteToFrequency('')).toBe(0);
    // A typo must not silently play A4.
    expect(noteToFrequency('H4')).toBe(0);
    expect(noteToFrequency('nope')).toBe(0);
    expect(noteToFrequency(-1)).toBe(0);
    expect(isRestToken('REST')).toBe(true);
    expect(isRestToken('C4')).toBe(false);
  });
});

describe('scales', () => {
  it('expands major and minor scales across octaves', () => {
    expect(scaleNotes('C', 'major', 8)).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
    expect(scaleNotes('A', 'minor', 3)).toEqual(['A4', 'B4', 'C5']);
  });

  it('supports pentatonic, blues and aliases', () => {
    expect(scaleNotes('C', 'pentatonic', 5)).toEqual(['C4', 'D4', 'E4', 'G4', 'A4']);
    expect(scaleNotes('C', 'blues', 3)).toEqual(['C4', 'D#4', 'F4']);
    expect(scaleNotes('C', 'MAJ', 2)).toEqual(['C4', 'D4']);
  });

  it('honours a starting octave and sharps', () => {
    expect(scaleNotes('G', 'major', 3, 3)).toEqual(['G3', 'A3', 'B3']);
    expect(scaleNotes('F#', 'major', 2)).toEqual(['F#4', 'G#4']);
  });

  it('returns an empty list for unknown roots or scales', () => {
    expect(scaleNotes('H', 'major', 4)).toEqual([]);
    expect(scaleNotes('C', 'not_a_scale', 4)).toEqual([]);
    expect(resolveScaleName('minor')).toBe('minor');
    expect(resolveScaleName('nope')).toBeNull();
    expect(listScaleNames()).toContain('harmonic_minor');
  });
});

describe('chords', () => {
  it('expands triads and seventh chords', () => {
    expect(chordNotes('C')).toEqual(['C4', 'E4', 'G4']);
    expect(chordNotes('Am')).toEqual(['A4', 'C5', 'E5']);
    expect(chordNotes('Cmaj7')).toEqual(['C4', 'E4', 'G4', 'B4']);
    expect(chordNotes('F#dim7')).toEqual(['F#4', 'A4', 'C5', 'D#5']);
    expect(chordNotes('G7sus4')).toEqual(['G4', 'C5', 'D5', 'F5']);
  });

  it('reads flat roots and emits canonical sharp spellings', () => {
    expect(chordNotes('Bb')).toEqual(['A#4', 'D5', 'F5']);
    expect(chordNotes('Eb')).toEqual(['D#4', 'G4', 'A#4']);
    // A flat root and its sharp equivalent must produce identical pitches.
    expect(chordNotes('Bb').map(noteToFrequency)).toEqual(chordNotes('A#').map(noteToFrequency));
  });

  it('resolves the symbolic "C7" form that pitch parsing claims', () => {
    expect(chordNotes('C7')).toEqual(['C4', 'E4', 'G4', 'A#4']);
  });

  it('does not mistake an octave-carrying pitch for a chord', () => {
    // "C4" is a pitch, not a chord; expandToFrequencies resolves it as one note.
    expect(chordNotes('C4')).toEqual([]);
    expect(expandToFrequencies('C4')).toHaveLength(1);
  });

  it('expands chord arguments given as lists, symbols, freqs and dicts', () => {
    expect(expandToFrequencies(['C4', 'E4', 'G4'])).toHaveLength(3);
    expect(expandToFrequencies('Cmaj7')).toHaveLength(4);
    expect(expandToFrequencies([440, 660])).toEqual([440, 660]);
    expect(expandToFrequencies([{ note: 'A4' }])).toHaveLength(1);
    expect(expandToFrequencies([['C4', 'E4'], 'G4'])).toHaveLength(3);
    expect(expandToFrequencies('junk')).toHaveLength(0);
  });
});

describe('parseNoteSequence', () => {
  it('converts a beat-annotated melody into absolute timings', () => {
    const events = parseNoteSequence('C4:1 D4:1 E4:2', { bpm: 120 });
    expect(events.map(e => e.startMs)).toEqual([0, 500, 1000]);
    expect(events[0].durationMs).toBe(460); // 500ms slot * 0.92 default gate
    expect(events[2].durationMs).toBe(920);
    near(events[0].frequency, 261.63);
    expect(sequenceLengthMs(events)).toBe(1920);
  });

  it('treats a bare note as one beat and honours tempo', () => {
    expect(parseNoteSequence('C4 D4', { bpm: 240 }).map(e => e.startMs)).toEqual([0, 250]);
    expect(parseNoteSequence('C4').map(e => e.startMs)).toEqual([0]);
  });

  it('stacks a chord written in one token', () => {
    const events = parseNoteSequence('C4+E4+G4:1', { bpm: 120 });
    expect(events).toHaveLength(3);
    expect(new Set(events.map(e => e.startMs))).toEqual(new Set([0]));
  });

  it('mixes chord symbols and pitches in one melody', () => {
    const events = parseNoteSequence('Cmaj7 Am C4', { bpm: 120 });
    expect(events).toHaveLength(8);
    expect(events[0].startMs).toBe(0);
    expect(events[4].startMs).toBe(500);
  });

  it('applies the gate for staccato articulation', () => {
    expect(parseNoteSequence('C4:1', { bpm: 120, gate: 0.5 })[0].durationMs).toBe(250);
    expect(parseNoteSequence('C4:1:0.25', { bpm: 120 })[0].durationMs).toBe(125);
  });

  it('transposes by whole semitones', () => {
    const plain = parseNoteSequence('C4', { bpm: 120 })[0].frequency;
    const up = parseNoteSequence('C4', { bpm: 120, transpose: 12 })[0].frequency;
    near(up, plain * 2, 0.01);
  });

  it('consumes timeline for rests without adding a voice', () => {
    const events = parseNoteSequence('C4:1 R:1 E4:1', { bpm: 120 });
    expect(events).toHaveLength(2);
    expect(events[1].startMs).toBe(1000);
  });

  it('accepts list, tuple and dict forms', () => {
    expect(parseNoteSequence(['C4', 'D4', 'E4'], { bpm: 120 }).map(e => e.startMs)).toEqual([0, 500, 1000]);
    expect(parseNoteSequence([['C4', 2]], { bpm: 120 })[0].durationMs).toBe(920);
    expect(parseNoteSequence([{ note: 'C4', beats: 1 }], { bpm: 120 })).toHaveLength(1);
    expect(parseNoteSequence([{ notes: ['C4', 'E4'], beats: 1 }], { bpm: 120 })).toHaveLength(2);
  });

  it('falls back to defaults instead of producing NaN timings', () => {
    // A non-numeric tempo is the failure mode that used to silence melodies.
    const events = parseNoteSequence('C4:1 D4:1', { bpm: 'fast' as unknown as number });
    expect(events.every(e => Number.isFinite(e.startMs) && Number.isFinite(e.durationMs))).toBe(true);
    expect(events.map(e => e.startMs)).toEqual([0, 500]);
    expect(parseNoteSequence('C4:abc', { bpm: 120 })[0].durationMs).toBe(460);
  });

  it('returns no events for empty or unsupported input', () => {
    expect(parseNoteSequence('')).toEqual([]);
    expect(parseNoteSequence(undefined)).toEqual([]);
    expect(parseNoteSequence(42)).toEqual([]);
  });
});

describe('parseChordProgression', () => {
  it('holds each chord for its beat count', () => {
    // "C:1 Am:1 F:2 G:1" at 120bpm -> 500ms, 500ms, 1000ms, 500ms slots.
    const events = parseChordProgression('C:1 Am:1 F:2 G:1', { bpm: 120 });
    expect(events).toHaveLength(3 + 3 + 3 + 3);
    const slotStarts = [...new Set(events.map(event => event.startMs))];
    expect(slotStarts).toEqual([0, 500, 1000, 2000]);
    // The F:2 chord is held for twice as long as the one-beat chords.
    const holdPerSlot = slotStarts.map(start => events.find(event => event.startMs === start)!.durationMs);
    expect(holdPerSlot).toEqual([500, 500, 1000, 500]);
  });

  it('defaults to one beat per chord and skips unknown symbols', () => {
    expect(parseChordProgression('C')).toHaveLength(3);
    expect(parseChordProgression('H7')).toHaveLength(0);
  });
});

describe('envelope', () => {
  it('clamps hostile inputs to the documented ranges', () => {
    const env = resolveEnvelope({ attackMs: -5, decayMs: Number.NaN, sustain: 9, releaseMs: 1e9 });
    expect(env.attackMs).toBe(DEFAULT_ENVELOPE.attackMs);
    expect(env.decayMs).toBe(DEFAULT_ENVELOPE.decayMs);
    expect(env.sustain).toBe(1);
    expect(env.releaseMs).toBe(8000);
  });

  it('ramps attack, decays to sustain, holds, then releases to zero', () => {
    const env = resolveEnvelope({ attackMs: 100, decayMs: 100, sustain: 0.5, releaseMs: 100 });
    near(envelopeGainAt(0, 1000, env), 0, 0.001);
    near(envelopeGainAt(100, 1000, env), 1, 0.001);
    near(envelopeGainAt(200, 1000, env), 0.5, 0.001);
    near(envelopeGainAt(900, 1000, env), 0.5, 0.001);
    near(envelopeGainAt(1050, 1000, env), 0.25, 0.001);
    expect(envelopeGainAt(1200, 1000, env)).toBe(0);
    expect(envelopeGainAt(-5, 1000, env)).toBe(0);
  });
});

describe('renderSequence', () => {
  const melody = () => parseNoteSequence('C4:1 E4:1 G4:2', { bpm: 120 });

  it('produces audible samples rather than an empty buffer', () => {
    const samples = renderSequence(melody(), { sampleRate: 8000 });
    expect(samples.length).toBeGreaterThan(0);
    expect(Math.max(...samples)).toBeGreaterThan(0.1);
  });

  it('is deterministic so exported renders are reproducible', () => {
    const a = renderSequence(melody(), { sampleRate: 8000 });
    const b = renderSequence(melody(), { sampleRate: 8000 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('keeps stacked voices inside the 16-bit range', () => {
    const dense = parseNoteSequence('C4:4 D4:4 E4:4 F4:4 G4:4 A4:4 B4:4 C5:4', { bpm: 200 });
    const samples = renderSequence(dense, { sampleRate: 8000, volume: 1 });
    samples.forEach(sample => {
      expect(Number.isFinite(sample)).toBe(true);
      expect(Math.abs(sample)).toBeLessThanOrEqual(1);
    });
  });

  it('renders silence for rests and empty input', () => {
    expect(renderSequence(parseNoteSequence('R:1'))).toHaveLength(0);
    expect(renderSequence([])).toHaveLength(0);
  });

  it('suspends a note for the requested length plus the release tail', () => {
    const one = parseNoteSequence('C4:4', { bpm: 240 });
    const short = renderSequence(one, { sampleRate: 22050 });
    const long = renderSequence(parseNoteSequence('C4:8', { bpm: 240 }), { sampleRate: 22050 });
    expect(short.length).toBe(22712);
    expect(long.length).toBeGreaterThan(short.length);
  });
});

describe('encodeWav', () => {
  it('writes a canonical 44-byte RIFF/WAVE header', () => {
    const samples = new Float32Array([0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5]);
    const wav = encodeWav(samples, 8000);
    expect(wav.length).toBe(44 + samples.length * 2);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    const view = new DataView(wav.buffer);
    expect(view.getUint32(16, true)).toBe(16);  // fmt chunk size
    expect(view.getUint16(20, true)).toBe(1);   // PCM
    expect(view.getUint16(22, true)).toBe(1);   // mono
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
  });

  it('clamps out-of-range samples instead of wrapping around', () => {
    const wav = encodeWav(new Float32Array([4, -4]), 8000);
    const view = new DataView(wav.buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });

  it('emits a valid header for an empty render', () => {
    expect(encodeWav(new Float32Array(0), 8000).length).toBe(44);
  });
});

describe('bytesToBinaryString', () => {
  it('round-trips every byte', () => {
    const bytes = new Uint8Array([0, 1, 65, 127, 255, 82, 73, 70, 70]);
    expect(bytesToBinaryString(bytes).length).toBe(bytes.length);
    expect(bytesToBinaryString(bytes).charCodeAt(4)).toBe(255);
  });

  it('handles payloads larger than one internal chunk', () => {
    const bytes = new Uint8Array(20000).fill(65);
    expect(bytesToBinaryString(bytes)).toHaveLength(20000);
  });
});

describe('binaryStringToBytes', () => {
  it('inverts bytesToBinaryString so saved files can be read back', () => {
    const original = new Uint8Array(512);
    for (let i = 0; i < original.length; i++) original[i] = (i * 7) % 256;
    expect(Array.from(binaryStringToBytes(bytesToBinaryString(original)))).toEqual(Array.from(original));
  });

  it('masks values above 0xff rather than wrapping them', () => {
    expect(Array.from(binaryStringToBytes('Ā'))).toEqual([0]);
  });
});

/** Builds a RIFF/WAVE file with an arbitrary format so the decoder can be exercised. */
function buildWav(options: {
  format?: number;
  channels?: number;
  sampleRate?: number;
  bits?: number;
  writeSample?: (view: DataView, offset: number, index: number) => void;
  frames?: number;
  prefixChunk?: boolean;
}): Uint8Array {
  const {
    format = 1,
    channels = 1,
    sampleRate = 22050,
    bits = 16,
    writeSample = () => {},
    frames = 4,
    prefixChunk = false,
  } = options;
  const bytesPerSample = bits / 8;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const prefixSize = prefixChunk ? 12 : 0;
  const buffer = new ArrayBuffer(44 + prefixSize + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + prefixSize + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * blockAlign), true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bits, true);

  let cursor = 36;
  if (prefixChunk) {
    // A LIST chunk ahead of `data` shifts the payload off the canonical offset.
    writeString(cursor, 'LIST');
    view.setUint32(cursor + 4, 4, true);
    writeString(cursor + 8, 'INFO');
    cursor += 12;
  }

  writeString(cursor, 'data');
  view.setUint32(cursor + 4, dataSize, true);
  const dataStart = cursor + 8;

  const total = frames * channels;
  for (let index = 0; index < total; index++) {
    writeSample(view, dataStart + index * bytesPerSample, index);
  }
  return new Uint8Array(buffer);
}

describe('decodeWav', () => {
  it('round-trips a file produced by encodeWav', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 0.25, -0.25, 1, -1, 0]);
    const decoded = decodeWav(encodeWav(samples, 22050));
    expect(decoded).not.toBeNull();
    expect(decoded!.sampleRate).toBe(22050);
    expect(decoded!.frames).toBe(samples.length);
    expect(decoded!.channels).toHaveLength(1);
    expect(decoded!.bitsPerSample).toBe(16);
    samples.forEach((value, index) => near(decoded!.channels[0][index], value, 0.001));
  });

  it('centres 8-bit unsigned samples on 128', () => {
    const decoded = decodeWav(buildWav({
      bits: 8,
      frames: 3,
      writeSample: (view, offset, index) => view.setUint8(offset, [0, 128, 255][index]),
    }));
    near(decoded!.channels[0][0], -1);
    expect(decoded!.channels[0][1]).toBe(0);
    near(decoded!.channels[0][2], 0.992);
  });

  it('decodes 24-bit samples sign-correctly', () => {
    const decoded = decodeWav(buildWav({
      bits: 24,
      frames: 2,
      writeSample: (view, offset, index) => {
        const value = index === 0 ? 0x7fffff : -0x800000;
        view.setUint8(offset, value & 0xff);
        view.setUint8(offset + 1, (value >> 8) & 0xff);
        view.setUint8(offset + 2, (value >> 16) & 0xff);
      },
    }));
    near(decoded!.channels[0][0], 1, 0.001);
    near(decoded!.channels[0][1], -1, 0.001);
    expect(decoded!.bitsPerSample).toBe(24);
  });

  it('decodes 32-bit IEEE float without rescaling', () => {
    const decoded = decodeWav(buildWav({
      format: 3,
      bits: 32,
      frames: 3,
      writeSample: (view, offset, index) => view.setFloat32(offset, [0.1, -0.75, 0.99][index], true),
    }));
    expect(decoded!.isFloat).toBe(true);
    near(decoded!.channels[0][0], 0.1, 0.0001);
    near(decoded!.channels[0][1], -0.75, 0.0001);
    near(decoded!.channels[0][2], 0.99, 0.0001);
  });

  it('de-interleaves stereo frames into separate channels', () => {
    const decoded = decodeWav(buildWav({
      channels: 2,
      frames: 2,
      writeSample: (view, offset, index) => view.setInt16(offset, index % 2 === 0 ? 16384 : -16384, true),
    }));
    expect(decoded!.channels).toHaveLength(2);
    // Samples are stored frame-interleaved, so indices 0,2 are the left
    // channel and 1,3 the right one.
    near(decoded!.channels[0][0], 0.5, 0.001);
    near(decoded!.channels[0][1], 0.5, 0.001);
    near(decoded!.channels[1][0], -0.5, 0.001);
    near(decoded!.channels[1][1], -0.5, 0.001);
  });

  it('finds the data chunk past an intervening LIST chunk', () => {
    const decoded = decodeWav(buildWav({ prefixChunk: true, frames: 2 }));
    expect(decoded!.frames).toBe(2);
  });

  it('resolves the real tag from an EXTENSIBLE header', () => {
    // fmt grows to the 40-byte extensible layout, where the real format tag
    // lives in the first two bytes of the trailing SubFormat GUID.
    const dataSize = 2;
    const extended = new Uint8Array(12 + 8 + 40 + 8 + dataSize);
    const view = new DataView(extended.buffer);
    const writeString = (offset: number, text: string) => {
      for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, extended.length - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 40, true);
    view.setUint16(20, 0xfffe, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint16(36, 22, true);
    view.setUint16(38, 16, true);
    view.setUint32(40, 3, true);
    view.setUint16(44, 1, true); // SubFormat GUID tag: PCM

    writeString(60, 'data');
    view.setUint32(64, dataSize, true);
    view.setInt16(68, 8192, true);

    const decoded = decodeWav(extended);
    expect(decoded).not.toBeNull();
    expect(decoded!.isFloat).toBe(false);
    expect(decoded!.sampleRate).toBe(16000);
    near(decoded!.channels[0][0], 0.25, 0.001);
  });

  it('rejects payloads that are not RIFF/WAVE', () => {
    expect(decodeWav(new Uint8Array(100))).toBeNull();
    const wrongTag = new Uint8Array(encodeWav(new Float32Array(8), 8000));
    wrongTag.set([0x52, 0x49, 0x46, 0x58], 0); // "RIFX" big-endian marker
    expect(decodeWav(wrongTag)).toBeNull();
  });

  it('rejects truncated and empty payloads', () => {
    expect(decodeWav(new Uint8Array(0))).toBeNull();
    expect(decodeWav(new Uint8Array(20))).toBeNull();
    expect(decodeWav(encodeWav(new Float32Array(0), 8000))).toBeNull();
  });
});

describe('describeWav', () => {
  it('summarises duration, rate, layout and depth', () => {
    const decoded = decodeWav(encodeWav(new Float32Array(22050), 22050))!;
    expect(describeWav(decoded)).toBe('1.00s, 22050 Hz, mono, 16-bit pcm');
  });

  it('labels multi-channel layouts', () => {
    const decoded = decodeWav(buildWav({ channels: 2, frames: 100, sampleRate: 8000 }))!;
    expect(describeWav(decoded)).toBe('0.01s, 8000 Hz, 2ch, 16-bit pcm');
  });
});
