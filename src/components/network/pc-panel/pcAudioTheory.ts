// pcAudioTheory.ts
// Pure music-theory helpers for the embedded Python audio engine.
// Deliberately free of Web Audio / DOM references so every rule below is
// directly unit-testable in a plain Node environment.

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

/** Waveforms accepted by every public audio entry point. */
export const WAVEFORM_TYPES: readonly WaveformType[] = [
  'sine',
  'square',
  'sawtooth',
  'triangle',
  'noise',
];

/** Octave assumed when a pitch class is written without a number ("C" -> "C4"). */
const DEFAULT_OCTAVE = 4;

/** Semitone offset of every supported pitch class, relative to C. */
const PITCH_CLASSES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11,
};

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Tokens that mean "silence" rather than a pitch. */
const REST_TOKENS = new Set(['REST', 'R', '0', '-', 'N', 'SILENCE', '.']);

/** "C", "C4", "C#4", "Bb3", "A4+10" (10 cent offset), "F-1" */
const NOTE_PATTERN = /^([A-Ga-g])([#bB]?)(-?\d+)?(?:([+-]-?\d+))?$/;
/** Leading root of a scale or chord symbol. */
const PITCH_ROOT_PATTERN = /^([A-Ga-g])([#bB]?)/;
/** "440", "440Hz", "1.5khz" */
const RATE_PATTERN = /^(\d+(?:\.\d+)?)\s*(khz|hz)?$/i;

interface ParsedNote {
  /** Absolute semitone distance from A4, i.e. 0 == A4 == 440 Hz. */
  semitones: number;
  cents: number;
}

/**
 * Normalises a letter plus accidental to the canonical spelling used as a
 * PITCH_CLASSES key. Uppercasing the whole token would destroy flats
 * ("Db4" -> "DB4"), so the accidental is folded here instead.
 */
function canonicalPitchClass(letter: string, accidental: string): string {
  const root = letter.toUpperCase();
  if (accidental === '#') return `${root}#`;
  return accidental ? `${root}b` : root;
}

/**
 * Parses a scientific-pitch token. Returns null when the token is not a note,
 * which lets callers fall back to frequency or chord-symbol parsing.
 */
function parseNoteToken(text: string): ParsedNote | null {
  const noteMatch = NOTE_PATTERN.exec(text);
  if (!noteMatch) return null;
  const letter = noteMatch[1];
  const accidental = noteMatch[2];
  const octave = noteMatch[3] !== undefined ? parseInt(noteMatch[3], 10) : DEFAULT_OCTAVE;
  const cents = noteMatch[4] !== undefined ? parseInt(noteMatch[4], 10) : 0;
  const pitchClass = PITCH_CLASSES[canonicalPitchClass(letter, accidental)] ?? 0;
  return { semitones: (octave - DEFAULT_OCTAVE) * 12 + (pitchClass - 9), cents };
}

/** True when the token denotes silence. */
export function isRestToken(text: string): boolean {
  return REST_TOKENS.has(text.trim().toUpperCase());
}

/**
 * Converts a note name, pitch token or frequency into Hz.
 * Unresolvable input yields 0 (silence) rather than a surprising default tone.
 */
export function noteToFrequency(note: unknown): number {
  if (typeof note === 'number') {
    return Number.isFinite(note) && note > 0 ? note : 0;
  }
  const text = String(note ?? '').trim();
  if (!text) return 0;
  if (REST_TOKENS.has(text.toUpperCase())) return 0;

  const parsed = parseNoteToken(text);
  if (parsed) {
    return 440 * Math.pow(2, (parsed.semitones + parsed.cents / 100) / 12);
  }
  // Bare frequency, optionally suffixed with a unit. Returned exactly so that
  // expandToFrequencies([440, 660]) round-trips without cent quantisation.
  const rateMatch = RATE_PATTERN.exec(text);
  if (rateMatch) {
    const magnitude = parseFloat(rateMatch[1]);
    const hertz = (rateMatch[2] ?? 'hz').toLowerCase() === 'khz' ? magnitude * 1000 : magnitude;
    return hertz > 0 ? hertz : 0;
  }
  return 0;
}

/** Semitone class (0-11) of a root note, or null when unresolvable. */
function pitchClassOf(root: string): number | null {
  const match = PITCH_ROOT_PATTERN.exec(root.trim());
  if (!match) return null;
  return PITCH_CLASSES[canonicalPitchClass(match[1], match[2])] ?? null;
}

/** Builds a note name from an absolute semitone count where 0 == C0. */
function noteNameFromSemitones(semitones: number): string {
  const wrapped = ((Math.round(semitones) % 12) + 12) % 12;
  return `${SHARP_NAMES[wrapped]}${Math.floor(Math.round(semitones) / 12)}`;
}

// ── Scales ──────────────────────────────────────────────────────────────────

const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  whole_tone: [0, 2, 4, 6, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const SCALE_ALIASES: Record<string, string> = {
  maj: 'major',
  natural_minor: 'minor',
  min: 'minor',
  harmonicminor: 'harmonic_minor',
  melodicminor: 'melodic_minor',
  majpent: 'major_pentatonic',
  minpent: 'minor_pentatonic',
  pentatonicmajor: 'major_pentatonic',
  pentatonicminor: 'minor_pentatonic',
  wholetone: 'whole_tone',
};

/** Canonical scale key, or null when unknown. */
export function resolveScaleName(scale: unknown): string | null {
  const key = String(scale ?? 'major')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  const canonical = SCALE_ALIASES[key] ?? key;
  return Object.prototype.hasOwnProperty.call(SCALE_INTERVALS, canonical) ? canonical : null;
}

/** Names of every available scale, for discoverability from Python. */
export function listScaleNames(): string[] {
  return Object.keys(SCALE_INTERVALS);
}

/**
 * Expands a scale into note names, wrapping into higher octaves as needed.
 * `C major 9` -> ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5"]
 */
export function scaleNotes(root: string, scale: unknown = 'major', count = 8, octave = DEFAULT_OCTAVE): string[] {
  const pitchClass = pitchClassOf(root);
  const canonical = resolveScaleName(scale);
  if (pitchClass === null || !canonical) return [];
  const total = Math.max(0, Math.floor(count));
  const intervals = SCALE_INTERVALS[canonical];
  const base = octave * 12 + pitchClass;
  const notes: string[] = [];
  for (let i = 0; i < total; i++) {
    const step = Math.floor(i / intervals.length);
    const degree = intervals[i % intervals.length];
    notes.push(noteNameFromSemitones(base + degree + step * 12));
  }
  return notes;
}

// ── Chords ──────────────────────────────────────────────────────────────────

const CHORD_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  major: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  minor: [0, 3, 7],
  '-': [0, 3, 7],
  dim: [0, 3, 6],
  o: [0, 3, 6],
  aug: [0, 4, 8],
  '+': [0, 4, 8],
  sus: [0, 5, 7],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  ma7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  mmaj7: [0, 3, 7, 11],
  dim7: [0, 3, 6, 9],
  o7: [0, 3, 6, 9],
  '9': [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  add9: [0, 4, 7, 14],
  '7sus4': [0, 5, 7, 10],
  '11': [0, 4, 7, 10, 14, 17],
};

const CHORD_SYMBOL_ALIASES: Record<string, string> = {
  '°': 'dim',
  '∆': 'maj7',
  'ø': 'm7b5',
  '^': 'maj7',
};

/**
 * Normalises a chord quality suffix to one of the CHORD_INTERVALS keys.
 * Returns null when the suffix is not a recognised quality, which keeps
 * octave-carrying pitches such as "C4" from being read as chord symbols.
 */
function normalizeChordQuality(quality: string): string | null {
  if (!quality) return 'maj';
  const key = quality
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
    .replace(/[°∆ø^]/g, symbol => CHORD_SYMBOL_ALIASES[symbol] ?? symbol);
  if (!key) return 'maj';
  if (CHORD_INTERVALS[key]) return key;
  // Try progressively shorter suffixes so "Cmaj7#5" still resolves to a chord,
  // but never fall back to a bare major triad for unrecognised text.
  for (let cut = 1; cut < key.length; cut++) {
    const candidate = key.slice(0, key.length - cut);
    if (candidate && CHORD_INTERVALS[candidate]) return candidate;
  }
  return null;
}

/**
 * Expands a chord symbol into note names.
 * "C" / "Cm" / "Cmaj7" / "Am" / "F#dim7" / "Bb" / "G7sus4" -> note names.
 * Returns an empty list for anything that is not a chord symbol, so callers
 * can fall back to plain pitch parsing.
 */
export function chordNotes(symbol: string, octave = DEFAULT_OCTAVE): string[] {
  const match = /^([A-Ga-g])([#bB]?)(.*)$/.exec(symbol.trim());
  if (!match) return [];
  const pitchClass = PITCH_CLASSES[canonicalPitchClass(match[1], match[2])];
  if (pitchClass === undefined) return [];
  const quality = normalizeChordQuality(match[3]);
  if (!quality) return [];
  const intervals = CHORD_INTERVALS[quality];
  const base = octave * 12 + pitchClass;
  return intervals.map(interval => noteNameFromSemitones(base + interval));
}

/** Names of every available chord quality, for discoverability from Python. */
export function listChordQualities(): string[] {
  return Object.keys(CHORD_INTERVALS);
}

// ── Note sequences ──────────────────────────────────────────────────────────

/** A single sounding pitch with an absolute position on the timeline. */
export interface TimedNote {
  frequency: number;
  startMs: number;
  durationMs: number;
}

export interface SequenceOptions {
  /** Tempo used to convert beat counts into milliseconds. */
  bpm?: number;
  /** Beat length applied to notes that do not specify one. */
  defaultBeats?: number;
  /** Sounded fraction of each slot: 1 = legato, 0.5 = staccato. */
  gate?: number;
  /** Semitones added to every pitch. */
  transpose?: number;
}

/** One time slot of a sequence, which may hold a chord. */
interface SequenceCell {
  pitches: string[];
  beats: number;
  gate: number;
}

const DEFAULT_BPM = 120;

/** Resolves the beat length in ms, falling back to 120 bpm for junk input. */
export function beatDurationMs(bpm: unknown): number {
  const value = typeof bpm === 'number' ? bpm : Number(bpm);
  if (!Number.isFinite(value) || value <= 0) return 60000 / DEFAULT_BPM;
  return 60000 / value;
}

function positiveOr(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampGate(gate: unknown, fallback: number): number {
  const parsed = typeof gate === 'number' ? gate : Number(gate);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(1, parsed);
}

/** Parses "C4:1", "C4+E4+G4:2", "C4:1:0.5", "Bb3", "440" into a cell. */
function cellFromToken(token: string, defaultBeats: number, defaultGate: number): SequenceCell {
  const segments = token.split(':');
  const head = segments[0].trim();
  const beats = positiveOr(parseFloat(segments[1]), defaultBeats);
  const gate = clampGate(parseFloat(segments[2]), defaultGate);
  const pitches = head.length === 0 ? ['REST'] : head.split('+').map(p => p.trim()).filter(Boolean);
  return { pitches: pitches.length > 0 ? pitches : ['REST'], beats, gate };
}

function cellFromUnknown(item: unknown, defaultBeats: number, defaultGate: number): SequenceCell {
  if (typeof item === 'number') {
    return { pitches: [String(item)], beats: defaultBeats, gate: defaultGate };
  }
  if (typeof item === 'string') {
    return cellFromToken(item, defaultBeats, defaultGate);
  }
  if (Array.isArray(item)) {
    if (item.length === 0) return { pitches: ['REST'], beats: defaultBeats, gate: defaultGate };
    // Unambiguous rule: an all-string list is a chord, anything else is
    // [pitch, beats, gate?]. So ["C4", "E4", "G4"] is a chord while
    // ["C4", 2, 0.5] is a single note lasting two beats.
    if (item.length > 1 && item.every(entry => typeof entry === 'string')) {
      return { pitches: item.map(entry => String(entry).trim()), beats: defaultBeats, gate: defaultGate };
    }
    const [pitch, beats, gate] = item;
    return cellFromToken(
      `${String(pitch)}:${String(beats ?? defaultBeats)}:${String(gate ?? defaultGate)}`,
      defaultBeats,
      defaultGate,
    );
  }
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    const chordSource = record.notes ?? record.chord;
    const pitchSource = record.note ?? record.pitch ?? record.freq ?? record.frequency;
    const tokens: string[] = Array.isArray(chordSource)
      ? chordSource.map(entry => String(entry).trim())
      : pitchSource !== undefined
        ? [String(pitchSource).trim()]
        : [];
    const explicitMs = record.duration_ms ?? record.durationMs;
    const beats = positiveOr(
      record.beats ?? (explicitMs !== undefined ? Number(explicitMs) / beatDurationMs(record.bpm) : undefined),
      defaultBeats,
    );
    return {
      pitches: tokens.length > 0 ? tokens : ['REST'],
      beats,
      gate: clampGate(record.gate, defaultGate),
    };
  }
  return { pitches: ['REST'], beats: defaultBeats, gate: defaultGate };
}

/** A note name has an explicit octave; a chord symbol never does. */
function isPlainPitchToken(token: string): boolean {
  return NOTE_PATTERN.test(token.trim().toUpperCase());
}

/**
 * Resolves one sequence entry into zero or more sounding frequencies.
 * A rest contributes no voice, a plain pitch (or bare frequency) contributes
 * one, and a chord symbol contributes its full voicing.
 */
function resolvePitches(token: string, transpose: number): number[] {
  const trimmed = token.trim();
  if (!trimmed || isRestToken(trimmed)) return [];
  const transposeRatio = Math.pow(2, transpose / 12);
  if (isPlainPitchToken(trimmed)) {
    const frequency = noteToFrequency(trimmed);
    return frequency > 0 ? [frequency * transposeRatio] : [];
  }
  const chord = chordNotes(trimmed);
  if (chord.length > 0) {
    return chord
      .map(member => noteToFrequency(member) * transposeRatio)
      .filter(frequency => frequency > 0);
  }
  const frequency = noteToFrequency(trimmed);
  return frequency > 0 ? [frequency * transposeRatio] : [];
}

/**
 * Normalises every accepted sequence notation into absolute timed pitches.
 *
 * Supported inputs:
 *   "C4:1 D4:1 E4:2"                              -> beats after the colon
 *   "C4+E4+G4:2"                                  -> chord inside one slot
 *   "C4:1:0.5"                                    -> explicit gate (staccato)
 *   ["C4", ["C4", 2], {"note": "D4", "beats": 1}] -> list forms
 *   "Cmaj7 Am F G"                                 -> chord symbols
 *
 * A bare letter followed by digits is always read as a pitch with an octave
 * ("C4" is C4, not a chord). Chord symbols therefore need a letter suffix,
 * e.g. "Cmaj7"; use chord_notes() when a symbolic "C7" is intended.
 */
export function parseNoteSequence(source: unknown, options: SequenceOptions = {}): TimedNote[] {
  const defaultBeats = positiveOr(options.defaultBeats, 1);
  const defaultGate = clampGate(options.gate, 0.92);
  const transpose = Number.isFinite(Number(options.transpose)) ? Number(options.transpose) : 0;

  const cells: SequenceCell[] = typeof source === 'string'
    ? source.trim().split(/\s+/).filter(Boolean).map(token => cellFromToken(token, defaultBeats, defaultGate))
    : Array.isArray(source)
      ? source.map(item => cellFromUnknown(item, defaultBeats, defaultGate))
      : source && typeof source === 'object'
        ? [cellFromUnknown(source, defaultBeats, defaultGate)]
        : [];

  const timed: TimedNote[] = [];
  let cursorMs = 0;
  for (const cell of cells) {
    const spanMs = beatDurationMs(options.bpm) * cell.beats;
    const soundingMs = Math.max(20, spanMs * cell.gate);
    for (const frequency of resolvePitches(cell.pitches[0] ?? '', transpose)) {
      timed.push({ frequency, startMs: cursorMs, durationMs: soundingMs });
    }
    // A chord cell holds several pitches in one token ("C4+E4+G4"); any
    // remaining tokens of the same cell are additional simultaneous voices.
    for (const extra of cell.pitches.slice(1)) {
      for (const frequency of resolvePitches(extra, transpose)) {
        timed.push({ frequency, startMs: cursorMs, durationMs: soundingMs });
      }
    }
    cursorMs += spanMs;
  }
  return timed;
}

/**
 * Expands a chord progression into timed notes, where every entry is a chord
 * symbol held for a number of beats. "C:1 Am:1 F:2 G:1" -> four chords.
 */
export function parseChordProgression(
  source: unknown,
  options: SequenceOptions & { octave?: number } = {},
): TimedNote[] {
  const octave = Number.isFinite(Number(options.octave)) ? Number(options.octave) : DEFAULT_OCTAVE;
  const defaultBeats = positiveOr(options.defaultBeats, 1);
  const gate = clampGate(options.gate, 1);
  const transpose = Number.isFinite(Number(options.transpose)) ? Number(options.transpose) : 0;

  const tokens: string[] = typeof source === 'string'
    ? source.trim().split(/\s+/).filter(Boolean)
    : Array.isArray(source)
      ? source.map(item => String(item).trim())
      : [];

  const timed: TimedNote[] = [];
  let cursorMs = 0;
  for (const token of tokens) {
    const segments = token.split(':');
    const symbol = segments[0].trim();
    const beats = positiveOr(parseFloat(segments[1]), defaultBeats);
    const spanMs = beatDurationMs(options.bpm) * beats;
    const soundingMs = Math.max(20, spanMs * gate);
    const members = chordNotes(symbol, octave);
    for (const member of members) {
      const frequency = noteToFrequency(member) * Math.pow(2, transpose / 12);
      if (frequency > 0) timed.push({ frequency, startMs: cursorMs, durationMs: soundingMs });
    }
    cursorMs += spanMs;
  }
  return timed;
}

/** Total timeline length in ms, including trailing rests. */
export function sequenceLengthMs(timed: TimedNote[]): number {
  return timed.reduce((max, note) => Math.max(max, note.startMs + note.durationMs), 0);
}

/**
 * Resolves a chord argument into Hz values, accepting notes, chord symbols,
 * bare frequencies, dicts and nested lists.
 *
 *   "Cmaj7"                -> C4 E4 G4 B4
 *   ["C4", "E4", "G4"]     -> three pitches
 *   [{"note": "A4"}]       -> one pitch
 *   [440, 660]             -> two frequencies
 */
export function expandToFrequencies(source: unknown, transpose = 0): number[] {
  const list = Array.isArray(source) ? source : [source];
  const frequencies: number[] = [];
  for (const entry of list) {
    if (Array.isArray(entry)) {
      frequencies.push(...expandToFrequencies(entry, transpose));
      continue;
    }
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const nested = record.notes ?? record.chord ?? record.note ?? record.pitch ?? record.freq ?? record.frequency;
      if (Array.isArray(nested)) {
        frequencies.push(...expandToFrequencies(nested, transpose));
      } else if (nested !== undefined) {
        frequencies.push(...resolvePitches(String(nested), transpose));
      }
      continue;
    }
    frequencies.push(...resolvePitches(String(entry), transpose));
  }
  return frequencies;
}
