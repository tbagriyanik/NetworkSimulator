// pcPythonAudioModule.ts
// Embedded Python Audio & Dynamic Music Synthesis Module (compatible with audio, music, synth, winsound)

import {
  audioEngine,
  noteToFrequency,
  generateWavFile,
  type WaveformType,
} from './pcAudioPlayer';
import { loadFs, saveFs, writeFile } from './pcFileSystem';

export interface PyNoteEvent {
  noteOrFreq: string | number;
  durationMs: number;
  waveform?: WaveformType;
  volume?: number;
}

/**
 * Class representing a synthesizer instrument with ADSR envelope settings
 */
export class PySynth {
  public waveform: WaveformType = 'sine';
  public volume = 0.5;
  public attackMs = 20;
  public releaseMs = 50;

  constructor(...args: unknown[]) {
    if (args.length > 0 && typeof args[0] === 'string') {
      this.waveform = (args[0].toLowerCase() as WaveformType) || 'sine';
    }
    if (args.length > 1 && typeof args[1] === 'number') {
      this.volume = Number(args[1]);
    }
  }

  public play_tone(freq: number, durationMs = 300): void {
    void audioEngine.playTone(Number(freq), Number(durationMs), this.waveform, this.volume, this.attackMs, this.releaseMs);
  }

  public play_note(note: string, durationMs = 300): void {
    const f = noteToFrequency(note);
    this.play_tone(f, durationMs);
  }

  public play_chord(notes: string[], durationMs = 600): void {
    void audioEngine.playChord(notes, Number(durationMs), this.waveform, this.volume);
  }
}

/**
 * Class representing a musical sequence or track
 */
export class PyTrack {
  public name: string;
  public bpm: number;
  public notes: PyNoteEvent[] = [];

  constructor(name: unknown = 'Track', bpm: unknown = 120) {
    this.name = String(name ?? 'Track');
    this.bpm = Number(bpm || 120);
  }

  public add(note: string | number, beats = 1, wave: WaveformType = 'sine', vol = 0.5): this {
    const beatMs = (60 / this.bpm) * 1000;
    this.notes.push({
      noteOrFreq: note,
      durationMs: beats * beatMs,
      waveform: wave,
      volume: vol,
    });
    return this;
  }

  public play(): void {
    let delay = 0;
    this.notes.forEach(n => {
      const f = typeof n.noteOrFreq === 'string' ? noteToFrequency(n.noteOrFreq) : Number(n.noteOrFreq);
      audioEngine.scheduleTimeout(() => {
        void audioEngine.playTone(f, n.durationMs, n.waveform || 'sine', n.volume ?? 0.5);
      }, delay);
      delay += n.durationMs;
    });
  }
}

/**
 * Factory creating Python audio and music module for a device
 */
export function createPythonAudioModule(deviceId: string): Record<string, unknown> {
  const playTone = (freq: unknown, durationMs: unknown = 250, wave: unknown = 'sine', volume: unknown = 0.5) => {
    const f = Number(freq || 440);
    const d = Number(durationMs || 250);
    const w = String(wave || 'sine').toLowerCase() as WaveformType;
    const v = Number(volume ?? 0.5);
    void audioEngine.playTone(f, d, w, v);
  };

  const playNote = (note: unknown, durationMs: unknown = 300, wave: unknown = 'sine', volume: unknown = 0.5) => {
    const f = noteToFrequency(String(note || 'C4'));
    const d = Number(durationMs || 300);
    const w = String(wave || 'sine').toLowerCase() as WaveformType;
    const v = Number(volume ?? 0.5);
    void audioEngine.playTone(f, d, w, v);
  };

  const playChord = (notes: unknown, durationMs: unknown = 600, wave: unknown = 'sine', volume: unknown = 0.5) => {
    const arr = Array.isArray(notes) ? notes : [notes];
    const d = Number(durationMs || 600);
    const w = String(wave || 'sine').toLowerCase() as WaveformType;
    const v = Number(volume ?? 0.5);
    void audioEngine.playChord(arr as (string | number)[], d, w, v);
  };

  const playMelody = (melody: unknown, bpm: unknown = 120, wave: unknown = 'sine', volume: unknown = 0.5) => {
    const beatsPerMin = Number(bpm || 120);
    const beatMs = (60 / beatsPerMin) * 1000;
    const w = String(wave || 'sine').toLowerCase() as WaveformType;
    const v = Number(volume ?? 0.5);

    let items: Array<{ note: string; duration: number }> = [];

    if (typeof melody === 'string') {
      // String format e.g. "C4:1 D4:1 E4:1 C4:1" or "C4 D4 E4 C4"
      const parts = melody.trim().split(/\s+/);
      items = parts.map(p => {
        const [n, dStr] = p.split(':');
        const dur = dStr ? parseFloat(dStr) * beatMs : beatMs * 0.8;
        return { note: n, duration: dur };
      });
    } else if (Array.isArray(melody)) {
      items = melody.map(item => {
        if (typeof item === 'string') {
          return { note: item, duration: beatMs * 0.8 };
        }
        if (Array.isArray(item)) {
          return { note: String(item[0]), duration: Number(item[1] || beatMs) };
        }
        if (item && typeof item === 'object') {
          const obj = item as { note?: string; duration?: number };
          return { note: obj.note || 'C4', duration: obj.duration || beatMs };
        }
        return { note: 'C4', duration: beatMs };
      });
    }

    let delay = 0;
    items.forEach(it => {
      const freq = noteToFrequency(it.note);
      audioEngine.scheduleTimeout(() => {
        void audioEngine.playTone(freq, it.duration, w, v);
      }, delay);
      delay += it.duration;
    });
  };

  const playSfx = (name: unknown) => {
    void audioEngine.playPresetSoundEffect(String(name || 'beep'));
  };

  const stopAudio = () => {
    audioEngine.stopAll();
  };

  const setVolume = (vol: unknown) => {
    audioEngine.setMasterVolume(Number(vol || 0.5));
  };

  const saveWav = (fileName: unknown, notesList: unknown, bpm = 120, wave = 'sine'): string => {
    const sampleRate = 22050;
    const path = String(fileName || 'music.wav');
    const b = Number(bpm || 120);
    const beatMs = (60 / b) * 1000;
    const w = String(wave || 'sine').toLowerCase() as WaveformType;

    let items: Array<{ freq: number; samplesCount: number }> = [];

    if (typeof notesList === 'string') {
      const parts = notesList.trim().split(/\s+/);
      items = parts.map(p => {
        const [n, dStr] = p.split(':');
        const dur = dStr ? parseFloat(dStr) * beatMs : beatMs;
        return { freq: noteToFrequency(n), samplesCount: Math.floor((dur / 1000) * sampleRate) };
      });
    } else if (Array.isArray(notesList)) {
      items = notesList.map(item => {
        const noteStr = Array.isArray(item) ? String(item[0]) : typeof item === 'string' ? item : 'C4';
        const dur = Array.isArray(item) ? Number(item[1] || beatMs) : beatMs;
        return { freq: noteToFrequency(noteStr), samplesCount: Math.floor((dur / 1000) * sampleRate) };
      });
    }

    const totalSamples = items.reduce((acc, it) => acc + it.samplesCount, 0);
    const samples = new Float32Array(totalSamples);
    let sampleOffset = 0;

    items.forEach(it => {
      for (let i = 0; i < it.samplesCount; i++) {
        const t = i / sampleRate;
        let s = 0;
        if (it.freq > 0) {
          if (w === 'square') {
            s = Math.sin(2 * Math.PI * it.freq * t) >= 0 ? 0.5 : -0.5;
          } else if (w === 'sawtooth') {
            s = 2 * ((t * it.freq) % 1) - 1;
          } else if (w === 'triangle') {
            s = 2 * Math.abs(2 * ((t * it.freq) % 1) - 1) - 1;
          } else {
            s = Math.sin(2 * Math.PI * it.freq * t);
          }
          // Linear decay envelope at the end of each note
          const decay = Math.max(0, 1 - (i / it.samplesCount) * 0.5);
          s *= decay * 0.6;
        }
        samples[sampleOffset + i] = s;
      }
      sampleOffset += it.samplesCount;
    });

    const wavBytes = generateWavFile(samples, sampleRate);
    // Convert to binary string
    let binStr = '';
    for (let i = 0; i < wavBytes.length; i++) {
      binStr += String.fromCharCode(wavBytes[i]);
    }

    try {
      const fs = loadFs(deviceId);
      const targetPath = path.includes('\\') || path.includes('/') ? path : `C:\\${path}`;
      writeFile(fs, targetPath, binStr);
      saveFs(deviceId, fs);
    } catch { /* ignored */ }

    return `Saved ${wavBytes.length} bytes to ${path}`;
  };

  function callable<T extends new (...args: unknown[]) => unknown>(ClassType: T) {
    const fn = function (...args: unknown[]) {
      return new ClassType(...args);
    };
    Object.setPrototypeOf(fn, ClassType);
    fn.prototype = ClassType.prototype;
    return fn as unknown as T;
  }

  return {
    play_tone: playTone,
    play_note: playNote,
    play_chord: playChord,
    play_melody: playMelody,
    play_sfx: playSfx,
    beep: (f = 440, d = 200) => playTone(f, d),
    stop: stopAudio,
    set_volume: setVolume,
    save_wav: saveWav,
    export_wav: saveWav,
    note_to_freq: (n: string) => noteToFrequency(n),
    Synth: callable(PySynth),
    Track: callable(PyTrack),
    winsound: {
      Beep: (frequency: unknown, duration: unknown) => playTone(frequency, duration, 'square', 0.5),
    },
  };
}
