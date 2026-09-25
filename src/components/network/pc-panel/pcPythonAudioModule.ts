// pcPythonAudioModule.ts
// Embedded Python Audio & Dynamic Music Synthesis Module
// (exposed to scripts as `audio`, `music`, `sound`, `synth` and `winsound`).
//
// Two rules keep this module predictable from Python:
//   1. Every exported callable declares its parameter names via
//      `__pythonParamNames`, which is how the interpreter binds keyword
//      arguments. Without it, `play_chord(..., wave="triangle")` silently
//      drops the keyword and appends a stray object argument.
//   2. Every argument passes through a sanitiser, so a mistyped value falls
//      back to a documented default instead of becoming NaN.

import {
  audioEngine,
  listSoundEffectNames,
  toWaveform,
  type WaveformType,
} from './pcAudioPlayer';
import { binaryStringToBytes, bytesToBinaryString, decodeWav, describeWav, encodeWav, renderSequence } from './pcAudioRender';
import {
  chordNotes,
  expandToFrequencies,
  listChordQualities,
  listScaleNames,
  noteToFrequency,
  parseChordProgression,
  parseNoteSequence,
  scaleNotes,
  WAVEFORM_TYPES,
  type TimedNote,
} from './pcAudioTheory';
import { loadFs, readFile, saveFs, writeFile } from './pcFileSystem';

/** A Python-visible callable that advertises its parameter names. */
type KeywordAware = ((...args: unknown[]) => unknown) & { __pythonParamNames?: string[] };

/** Tags a function so the interpreter can bind Python keyword arguments. */
function tagKeywords<T extends KeywordAware>(fn: T, paramNames: string[]): T {
  fn.__pythonParamNames = paramNames;
  return fn;
}

/** Tags methods of a class prototype so `obj.method(a=1)` also binds. */
function tagMethods(instance: object, spec: Record<string, string[]>): void {
  const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
  Object.entries(spec).forEach(([name, paramNames]) => {
    const method = proto[name];
    if (typeof method === 'function') {
      (method as KeywordAware).__pythonParamNames = paramNames;
    }
  });
}

// ── Sanitisers ──────────────────────────────────────────────────────────────

function finiteOr(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampRange(value: unknown, min: number, max: number, fallback: number): number {
  return Math.min(max, Math.max(min, finiteOr(value, fallback)));
}

function clamp01(value: unknown, fallback: number): number {
  return clampRange(value, 0, 1, fallback);
}

function positiveOr(value: unknown, fallback: number): number {
  const parsed = finiteOr(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

function integerOr(value: unknown, fallback: number, min = 1, max = 512): number {
  const parsed = Math.round(finiteOr(value, fallback));
  return Math.min(max, Math.max(min, parsed));
}

// ── Module level state ──────────────────────────────────────────────────────

const DEFAULT_VOLUME = 0.5;
const DEFAULT_BPM = 120;
const DEFAULT_WAVE: WaveformType = 'sine';
/** Built-in effect names, used to tell a preset apart from a file path. */
const SFX_NAMES = new Set(listSoundEffectNames());

interface AudioModuleState {
  volume: number;
  wave: WaveformType;
}

function createState(): AudioModuleState {
  return { volume: DEFAULT_VOLUME, wave: DEFAULT_WAVE };
}

function resolveVolume(state: AudioModuleState, value: unknown): number {
  return value === undefined || value === null ? state.volume : clamp01(value, state.volume);
}

function resolveWave(state: AudioModuleState, value: unknown): WaveformType {
  if (value === undefined || value === null || value === '') return state.wave;
  return toWaveform(value, state.wave);
}

/** Builds a melody from any accepted notation, defaulting to 120 bpm. */
function buildMelody(source: unknown, bpm: unknown, gate: unknown, transpose: unknown): TimedNote[] {
  return parseNoteSequence(source, {
    bpm: positiveOr(bpm, DEFAULT_BPM),
    gate: finiteOr(gate, 0.92),
    transpose: Math.round(finiteOr(transpose, 0)),
  });
}

function buildProgression(
  source: unknown,
  bpm: unknown,
  octave: unknown,
  transpose: unknown,
): TimedNote[] {
  return parseChordProgression(source, {
    bpm: positiveOr(bpm, DEFAULT_BPM),
    octave: Math.round(finiteOr(octave, 4)),
    transpose: Math.round(finiteOr(transpose, 0)),
    gate: 1,
  });
}

function buildArpeggio(symbol: unknown, mode: unknown, octave: unknown): string[] {
  const members = chordNotes(String(symbol ?? ''), Math.round(finiteOr(octave, 4)));
  if (members.length === 0) return [];
  const key = String(mode ?? 'up').trim().toLowerCase();
  if (key === 'down') return [...members].reverse();
  if (key === 'updown' || key === 'up_down') {
    return [...members, ...[...members].reverse().slice(1, -1)];
  }
  return members;
}

/**
 * Class representing a synthesizer instrument with a full ADSR envelope.
 */
export class PySynth {
  public waveform: WaveformType = DEFAULT_WAVE;
  public volume = DEFAULT_VOLUME;
  public attackMs = 12;
  public decayMs = 70;
  /** Held level as a fraction of the peak, 0-1. */
  public sustain = 0.7;
  public releaseMs = 110;

  constructor(...args: unknown[]) {
    if (args.length > 0) this.waveform = toWaveform(args[0], DEFAULT_WAVE);
    if (args.length > 1) this.volume = clamp01(args[1], DEFAULT_VOLUME);
  }

  public get envelope(): { attackMs: number; decayMs: number; sustain: number; releaseMs: number } {
    return { attackMs: this.attackMs, decayMs: this.decayMs, sustain: this.sustain, releaseMs: this.releaseMs };
  }

  // Python-friendly aliases so scripts can read `lead.attack` directly.
  public get attack(): number { return this.attackMs; }
  public get decay(): number { return this.decayMs; }
  public get release(): number { return this.releaseMs; }

  /** Configures the ADSR envelope; any omitted stage keeps its current value. */
  public set_adsr(attack: unknown = this.attackMs, decay: unknown = this.decayMs, sustain: unknown = this.sustain, release: unknown = this.releaseMs): this {
    this.attackMs = clampRange(attack, 0, 4000, this.attackMs);
    this.decayMs = clampRange(decay, 0, 8000, this.decayMs);
    this.sustain = clamp01(sustain, this.sustain);
    this.releaseMs = clampRange(release, 0, 8000, this.releaseMs);
    return this;
  }

  public set_wave(wave: unknown): this {
    this.waveform = toWaveform(wave, this.waveform);
    return this;
  }

  public set_volume(volume: unknown): this {
    this.volume = clamp01(volume, this.volume);
    return this;
  }

  public play_tone(frequency: unknown, durationMs: unknown = 300): void {
    const freq = finiteOr(frequency, 0);
    if (freq <= 0) return;
    void audioEngine.playTone({
      frequency: freq,
      durationMs: positiveOr(durationMs, 300),
      waveform: this.waveform,
      volume: this.volume,
      envelope: this.envelope,
    });
  }

  public play_note(note: unknown, durationMs: unknown = 300): void {
    const freq = noteToFrequency(note);
    if (freq <= 0) return;
    void audioEngine.playTone({
      frequency: freq,
      durationMs: positiveOr(durationMs, 300),
      waveform: this.waveform,
      volume: this.volume,
      envelope: this.envelope,
    });
  }

  public play_chord(notes: unknown, durationMs: unknown = 600): void {
    const entries = expandToFrequencies(notes);
    if (entries.length === 0) return;
    void audioEngine.playChord(entries, positiveOr(durationMs, 600), this.waveform, this.volume, this.envelope);
  }

  public play_melody(melody: unknown, bpm: unknown = DEFAULT_BPM): void {
    const events = buildMelody(melody, bpm, undefined, undefined);
    void audioEngine.playSequence(events, { waveform: this.waveform, volume: this.volume, envelope: this.envelope });
  }
}

tagMethods(new PySynth(), {
  set_adsr: ['attack', 'decay', 'sustain', 'release'],
  set_wave: ['wave'],
  set_volume: ['volume'],
  play_tone: ['frequency', 'duration_ms'],
  play_note: ['note', 'duration_ms'],
  play_chord: ['notes', 'duration_ms'],
  play_melody: ['melody', 'bpm'],
});

/** A single entry of a PyTrack timeline. */
export interface PyNoteEvent {
  noteOrFreq: string | number;
  beats: number;
  /** Absolute position on the track timeline, in milliseconds. */
  startMs: number;
  waveform?: WaveformType;
  volume?: number;
}

/** Sounded fraction of each note slot applied when a track is played. */
const TRACK_GATE = 0.92;

/**
 * Class representing a musical sequence or track.
 */
export class PyTrack {
  public name: string;
  public bpm: number;
  public notes: PyNoteEvent[] = [];
  private cursorMs = 0;

  constructor(name: unknown = 'Track', bpm: unknown = DEFAULT_BPM) {
    this.name = String(name ?? 'Track');
    this.bpm = positiveOr(bpm, DEFAULT_BPM);
  }

  private beatMs(): number {
    return 60000 / this.bpm;
  }

  public add(note: string | number, beats: unknown = 1, wave: unknown = DEFAULT_WAVE, vol: unknown = DEFAULT_VOLUME): this {
    const heldBeats = positiveOr(beats, 1);
    this.notes.push({
      noteOrFreq: note,
      beats: heldBeats,
      startMs: this.cursorMs,
      waveform: toWaveform(wave, DEFAULT_WAVE),
      volume: clamp01(vol, DEFAULT_VOLUME),
    });
    this.cursorMs += heldBeats * this.beatMs();
    return this;
  }

  /** Appends a whole melody string, e.g. "C4:1 D4:1 E4:2". */
  public add_melody(melody: unknown): this {
    const baseMs = this.cursorMs;
    const beatMs = this.beatMs();
    // Parsed without a gate so the articulation applied at play time is not
    // compounded onto every note.
    const events = parseNoteSequence(melody, { bpm: this.bpm, gate: 1 });
    events.forEach(event => {
      this.notes.push({
        noteOrFreq: event.frequency,
        beats: event.durationMs / beatMs,
        startMs: baseMs + event.startMs,
        waveform: DEFAULT_WAVE,
        volume: DEFAULT_VOLUME,
      });
    });
    this.cursorMs = baseMs + events.reduce((max, event) => Math.max(max, event.startMs + event.durationMs), 0);
    return this;
  }

  public set_bpm(bpm: unknown): this {
    this.bpm = positiveOr(bpm, this.bpm);
    return this;
  }

  /** Materialises the stored timeline as absolute timed notes. */
  private toTimedNotes(): TimedNote[] {
    const beatMs = this.beatMs();
    return this.notes.map(note => {
      const frequency = typeof note.noteOrFreq === 'string'
        ? noteToFrequency(note.noteOrFreq)
        : finiteOr(note.noteOrFreq, 0);
      return {
        frequency,
        startMs: note.startMs,
        durationMs: Math.max(20, note.beats * beatMs * TRACK_GATE),
      };
    }).filter(note => note.frequency > 0);
  }

  public play(): void {
    const events = this.toTimedNotes();
    if (events.length === 0) return;
    void audioEngine.playSequence(events, { volume: DEFAULT_VOLUME });
  }

  /** Timeline length in milliseconds at the track's current tempo. */
  public duration_ms(): number {
    return this.toTimedNotes().reduce((max, note) => Math.max(max, note.startMs + note.durationMs), 0);
  }
}

tagMethods(new PyTrack(), {
  add: ['note', 'beats', 'wave', 'vol'],
  add_melody: ['melody'],
  set_bpm: ['bpm'],
});

/**
 * Wraps a class so `Synth(...)` can be called like a Python class.
 * `paramNames` lets the interpreter bind constructor keywords, e.g.
 * `Synth(waveform="square", volume=0.3)`.
 */
function callable<T extends new (...args: unknown[]) => unknown>(
  ClassType: T,
  paramNames: string[] = [],
): (...args: unknown[]) => unknown {
  const fn = function (...args: unknown[]) {
    return new ClassType(...args);
  };
  Object.setPrototypeOf(fn, ClassType);
  fn.prototype = ClassType.prototype;
  (fn as unknown as Record<string, unknown>).__pythonParamNames = paramNames;
  return fn as unknown as (...args: unknown[]) => unknown;
}

/**
 * Factory creating the Python audio and music module for a device.
 */
export function createPythonAudioModule(deviceId: string): Record<string, unknown> {
  const state = createState();

  const playTone = tagKeywords(
    (frequency: unknown = 440, durationMs: unknown = 250, wave: unknown = undefined, volume: unknown = undefined) => {
      const freq = finiteOr(frequency, 0);
      if (freq <= 0) return;
      void audioEngine.playTone({
        frequency: freq,
        durationMs: positiveOr(durationMs, 250),
        waveform: resolveWave(state, wave),
        volume: resolveVolume(state, volume),
      });
    },
    ['frequency', 'duration_ms', 'wave', 'volume'],
  );

  const playNote = tagKeywords(
    (note: unknown = 'C4', durationMs: unknown = 300, wave: unknown = undefined, volume: unknown = undefined) => {
      const freq = noteToFrequency(note);
      if (freq <= 0) return;
      void audioEngine.playTone({
        frequency: freq,
        durationMs: positiveOr(durationMs, 300),
        waveform: resolveWave(state, wave),
        volume: resolveVolume(state, volume),
      });
    },
    ['note', 'duration_ms', 'wave', 'volume'],
  );

  const playChord = tagKeywords(
    (notes: unknown = [], durationMs: unknown = 600, wave: unknown = undefined, volume: unknown = undefined) => {
      const entries = expandToFrequencies(notes);
      if (entries.length === 0) return;
      void audioEngine.playChord(
        entries,
        positiveOr(durationMs, 600),
        resolveWave(state, wave),
        resolveVolume(state, volume),
      );
    },
    ['notes', 'duration_ms', 'wave', 'volume'],
  );

  const playMelody = tagKeywords(
    (melody: unknown = '', bpm: unknown = DEFAULT_BPM, wave: unknown = undefined, volume: unknown = undefined, gate: unknown = undefined, transpose: unknown = 0) => {
      const events = buildMelody(melody, bpm, gate, transpose);
      if (events.length === 0) return 0;
      void audioEngine.playSequence(events, {
        waveform: resolveWave(state, wave),
        volume: resolveVolume(state, volume),
      });
      return events.length;
    },
    ['melody', 'bpm', 'wave', 'volume', 'gate', 'transpose'],
  );

  const playScale = tagKeywords(
    (root: unknown = 'C', scale: unknown = 'major', count: unknown = 8, bpm: unknown = DEFAULT_BPM, wave: unknown = undefined, volume: unknown = undefined, octave: unknown = 4) => {
      const notes = scaleNotes(String(root ?? 'C'), scale, integerOr(count, 8, 1, 64), Math.round(finiteOr(octave, 4)));
      if (notes.length === 0) return 0;
      const tempo = positiveOr(bpm, DEFAULT_BPM);
      const events = parseNoteSequence(notes.join(' '), { bpm: tempo, defaultBeats: 1 });
      void audioEngine.playSequence(events, {
        waveform: resolveWave(state, wave),
        volume: resolveVolume(state, volume),
      });
      return notes.length;
    },
    ['root', 'scale', 'count', 'bpm', 'wave', 'volume', 'octave'],
  );

  const playProgression = tagKeywords(
    (progression: unknown = '', bpm: unknown = DEFAULT_BPM, wave: unknown = undefined, volume: unknown = undefined, octave: unknown = 4) => {
      const events = buildProgression(progression, bpm, octave, 0);
      if (events.length === 0) return 0;
      void audioEngine.playSequence(events, {
        waveform: resolveWave(state, wave),
        volume: resolveVolume(state, volume),
      });
      return events.length;
    },
    ['progression', 'bpm', 'wave', 'volume', 'octave'],
  );

  const playArpeggio = tagKeywords(
    (chord: unknown = 'C', bpm: unknown = DEFAULT_BPM, wave: unknown = undefined, volume: unknown = undefined, octave: unknown = 4, mode: unknown = 'up') => {
      const notes = buildArpeggio(chord, mode, octave);
      if (notes.length === 0) return 0;
      const events = parseNoteSequence(notes.join(' '), { bpm: positiveOr(bpm, DEFAULT_BPM), defaultBeats: 1 });
      void audioEngine.playSequence(events, {
        waveform: resolveWave(state, wave),
        volume: resolveVolume(state, volume),
      });
      return notes.length;
    },
    ['chord', 'bpm', 'wave', 'volume', 'octave', 'mode'],
  );

  const playSfx = tagKeywords(
    (name: unknown = 'beep', volume: unknown = 0.8) => {
      void audioEngine.playPresetSoundEffect(String(name ?? 'beep'), clamp01(volume, 0.8));
    },
    ['name', 'volume'],
  );

  const setVolume = tagKeywords(
    (volume: unknown = DEFAULT_VOLUME) => {
      // Clamping (not `||`) matters here: set_volume(0) must actually mute.
      const next = clamp01(volume, DEFAULT_VOLUME);
      state.volume = next;
      audioEngine.setMasterVolume(next);
      return next;
    },
    ['volume'],
  );

  const setWave = tagKeywords(
    (wave: unknown = DEFAULT_WAVE) => {
      state.wave = toWaveform(wave, state.wave);
      return state.wave;
    },
    ['wave'],
  );

  const saveWav = tagKeywords(
    (fileName: unknown = 'music.wav', notes: unknown = '', bpm: unknown = DEFAULT_BPM, wave: unknown = undefined, volume: unknown = undefined, sampleRate: unknown = 22050) => {
      const path = String(fileName || 'music.wav');
      const tempo = positiveOr(bpm, DEFAULT_BPM);
      const rate = integerOr(sampleRate, 22050, 4000, 96000);
      const events = buildMelody(notes, tempo, undefined, undefined);
      const samples = renderSequence(events, {
        sampleRate: rate,
        waveform: resolveWave(state, wave),
        volume: resolveVolume(state, volume),
      });
      const wavBytes = encodeWav(samples, rate);

      let saved = false;
      try {
        const fs = loadFs(deviceId);
        const targetPath = path.includes('\\') || path.includes('/') ? path : `C:\\${path}`;
        saved = writeFile(fs, targetPath, bytesToBinaryString(wavBytes));
        if (saved) saveFs(deviceId, fs);
      } catch {
        saved = false;
      }
      const seconds = (samples.length / rate).toFixed(2);
      const noteWord = events.length === 1 ? 'note' : 'notes';
      return saved
        ? `Saved ${wavBytes.length} bytes (${seconds}s, ${events.length} ${noteWord}) to ${targetPathOf(path)}`
        : `Failed to save ${wavBytes.length} bytes to ${path}: path not writable`;
    },
    ['file_name', 'notes', 'bpm', 'wave', 'volume', 'sample_rate'],
  );

  /**
   * Resolves a user-supplied path and reads its bytes from the virtual disk.
   * Returns a report string either way so failures are visible in CMD output
   * rather than silently degrading to a preset sound.
   */
  const playWav = tagKeywords(
    (fileName: unknown = '', volume: unknown = undefined, atOffsetMs: unknown = 0) => {
      const path = String(fileName ?? '').trim();
      if (!path) return 'play_wav: no file name given';

      let content: string | null = null;
      let targetPath = targetPathOf(path);
      try {
        const fs = loadFs(deviceId);
        content = readFile(fs, targetPath);
        // Tolerate a missing drive prefix and a case-mismatched extension, both
        // common when the same path is typed by hand.
        if (content === null && !/[\\/:]/.test(path)) content = readFile(fs, targetPath.toLowerCase());
        if (content === null) content = readFile(fs, path);
      } catch {
        content = null;
      }

      if (content === null) return `play_wav: cannot read ${targetPath} (file not found)`;

      const decoded = decodeWav(binaryStringToBytes(content));
      if (!decoded) return `play_wav: ${targetPath} is not a decodable WAV file`;

      void audioEngine.playBuffer(decoded.channels, decoded.sampleRate, {
        volume: resolveVolume(state, volume),
        atOffsetMs: positiveOr(atOffsetMs, 0),
      });
      return `Playing ${targetPath} (${describeWav(decoded)})`;
    },
    ['file_name', 'volume', 'at_offset_ms'],
  );

  /** True when the text names a sound effect preset rather than a file. */
  const isPresetName = (name: string) => SFX_NAMES.has(name);

  const mute = () => {
    audioEngine.mute();
    return true;
  };

  const unmute = () => {
    audioEngine.unmute();
    return true;
  };

  return {
    // ── Notes, chords and melodies ──────────────────────────────────────────
    play_tone: playTone,
    play_note: playNote,
    play_chord: playChord,
    play_melody: playMelody,
    play_scale: playScale,
    play_progression: playProgression,
    play_arpeggio: playArpeggio,
    // ── Sound effects and transport ─────────────────────────────────────────
    play_sfx: playSfx,
    list_sfx: () => listSoundEffectNames(),
    beep: (frequency: unknown = 440, durationMs: unknown = 200) => playTone(frequency, durationMs, 'square'),
    stop: () => { audioEngine.stopAll(); },
    stop_all: () => { audioEngine.stopAll(); },
    // ── Global state ────────────────────────────────────────────────────────
    set_volume: setVolume,
    get_volume: () => audioEngine.getMasterVolume(),
    set_wave: setWave,
    get_wave: () => state.wave,
    list_waves: () => [...WAVEFORM_TYPES],
    mute,
    unmute,
    // ── Theory helpers ──────────────────────────────────────────────────────
    note_to_freq: (note: unknown) => noteToFrequency(note),
    scale_notes: (root: unknown = 'C', scale: unknown = 'major', count: unknown = 8, octave: unknown = 4) =>
      scaleNotes(String(root ?? 'C'), scale, integerOr(count, 8, 0, 64), Math.round(finiteOr(octave, 4))),
    chord_notes: (symbol: unknown = 'C', octave: unknown = 4) =>
      chordNotes(String(symbol ?? 'C'), Math.round(finiteOr(octave, 4))),
    list_scales: () => listScaleNames(),
    list_chords: () => listChordQualities(),
    // ── Disk export ─────────────────────────────────────────────────────────
    save_wav: saveWav,
    export_wav: saveWav,
    play_wav: playWav,
    play_file: playWav,
    // ── Object oriented API ─────────────────────────────────────────────────
    Synth: callable(PySynth, ['waveform', 'volume']),
    Track: callable(PyTrack, ['name', 'bpm']),
    // winsound compatibility shim
    winsound: {
      Beep: (frequency: unknown = 440, durationMs: unknown = 200) => playTone(frequency, durationMs, 'square'),
      MessageBeep: (type: unknown = 0) => {
        const table = ['beep', 'ding', 'error', 'exclamation'];
        const index = Math.abs(Math.round(finiteOr(type, 0))) % table.length;
        void audioEngine.playPresetSoundEffect(table[index], resolveVolume(state, undefined));
      },
      /**
       * Mirrors the real winsound.PlaySound: a built-in effect name plays that
       * preset, while anything that looks like a path is loaded from disk.
       */
      PlaySound: (name: unknown = 'beep', _flags: unknown = undefined) => {
        const text = String(name ?? 'beep').trim();
        if (isPresetName(text.toLowerCase())) {
          void audioEngine.playPresetSoundEffect(text, resolveVolume(state, undefined));
          return true;
        }
        const report = playWav(text);
        if (String(report).startsWith('Playing')) return true;
        console.warn(String(report));
        return false;
      },
      SND_PURGE: 0x0040,
      SND_NOWAIT: 0x0000,
      SND_SYNC: 0x0000,
      SND_NODEFAULT: 0x0002,
      SND_MEMORY: 0x0004,
    },
  };
}

/** Mirrors the path normalisation applied inside saveWav for its report string. */
function targetPathOf(path: string): string {
  return path.includes('\\') || path.includes('/') ? path : `C:\\${path}`;
}
