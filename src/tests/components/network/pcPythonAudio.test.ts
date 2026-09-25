import { describe, expect, it } from 'vitest';
import { executePythonScript } from '@/components/network/pc-panel/pcPythonRunner';
import { bindPythonArguments } from '@/components/network/pc-panel/pcPythonRunnerHelpers';
import { noteToFrequency, generateWavFile } from '@/components/network/pc-panel/pcAudioPlayer';
import { createPythonAudioModule } from '@/components/network/pc-panel/pcPythonAudioModule';
import { loadFs, readFile } from '@/components/network/pc-panel/pcFileSystem';

/** Reads a WAV that save_wav wrote into the simulated disk of a device. */
function readWav(deviceId: string, path: string): string {
  const content = readFile(loadFs(deviceId), path);
  expect(content).not.toBeNull();
  return content as string;
}

/** True when the 16-bit sample region contains any non-zero byte. */
function hasAudioData(wav: string): boolean {
  for (let i = 44; i < wav.length; i++) {
    if (wav.charCodeAt(i) !== 0) return true;
  }
  return false;
}

function run(code: string, deviceId: string) {
  return executePythonScript(code, [], undefined, deviceId);
}

describe('note and WAV primitives', () => {
  it('translates scientific pitch notes to correct frequencies', () => {
    expect(noteToFrequency('A4')).toBe(440);
    expect(Math.round(noteToFrequency('C4'))).toBe(262);
    expect(Math.round(noteToFrequency('C5'))).toBe(523);
    expect(noteToFrequency('REST')).toBe(0);
  });

  it('generates valid WAV file header and data chunk', () => {
    const samples = new Float32Array([0, 0.5, 1.0, 0.5, 0, -0.5, -1.0, -0.5]);
    const wav = generateWavFile(samples, 8000);
    expect(wav.length).toBe(44 + samples.length * 2);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
  });
});

describe('keyword argument binding', () => {
  const module = createPythonAudioModule('kwarg-device');

  it('binds a keyword to its own parameter instead of appending an object', () => {
    // This is the root cause of silent audio: the kwargs object used to be
    // pushed as a positional argument and Number({}) evaluated to NaN.
    const fn = module.play_chord as Parameters<typeof bindPythonArguments>[0];
    const bound = bindPythonArguments(fn, [['C4', 'E4', 'G4']], { duration_ms: 600, wave: 'triangle' });
    expect(bound[0]).toEqual(['C4', 'E4', 'G4']);
    expect(bound[1]).toBe(600);
    expect(bound[2]).toBe('triangle');
  });

  it('fills skipped parameters with undefined so defaults survive', () => {
    const fn = module.play_note as Parameters<typeof bindPythonArguments>[0];
    // play_note declares 4 parameters, so the result always has 4 slots.
    expect(bindPythonArguments(fn, ['A4'], { wave: 'sawtooth' })).toEqual(['A4', undefined, 'sawtooth', undefined]);
    expect(bindPythonArguments(fn, [], { note: 'A4', volume: 0.2 })).toEqual(['A4', undefined, undefined, 0.2]);
  });

  it('leaves positional-only calls untouched', () => {
    const fn = module.play_melody as Parameters<typeof bindPythonArguments>[0];
    expect(bindPythonArguments(fn, ['C4:1', 130], {})).toEqual(['C4:1', 130]);
  });

  it('advertises parameter names on every keyword-capable entry point', () => {
    const expected: Record<string, string[]> = {
      play_tone: ['frequency', 'duration_ms', 'wave', 'volume'],
      play_note: ['note', 'duration_ms', 'wave', 'volume'],
      play_chord: ['notes', 'duration_ms', 'wave', 'volume'],
      play_melody: ['melody', 'bpm', 'wave', 'volume', 'gate', 'transpose'],
      play_scale: ['root', 'scale', 'count', 'bpm', 'wave', 'volume', 'octave'],
      play_progression: ['progression', 'bpm', 'wave', 'volume', 'octave'],
      play_arpeggio: ['chord', 'bpm', 'wave', 'volume', 'octave', 'mode'],
      play_sfx: ['name', 'volume'],
      set_volume: ['volume'],
      set_wave: ['wave'],
      save_wav: ['file_name', 'notes', 'bpm', 'wave', 'volume', 'sample_rate'],
    };
    Object.entries(expected).forEach(([name, paramNames]) => {
      const fn = module[name] as { __pythonParamNames?: string[] };
      expect(fn?.__pythonParamNames, `${name} must declare its parameter names`).toEqual(paramNames);
    });
  });

  it('degrades gracefully when a function declares no parameter names', () => {
    const plain = (a: unknown, b: unknown) => [a, b];
    expect(bindPythonArguments(plain, [1], { extra: 2 })).toEqual([1, { extra: 2 }]);
    expect(bindPythonArguments(null, [], { extra: 2 })).toEqual([{ extra: 2 }]);
  });
});

describe('playing notes, chords and melodies from Python', () => {
  it('executes a script with tones, chords, melodies and WAV export', () => {
    const res = run(
      `
import music
from audio import play_tone, play_chord, play_sfx

play_tone(440, 100)
play_chord(["C4", "E4", "G4"], 100)
play_sfx("coin")

res = music.save_wav("test_song.wav", "C4:1 D4:1 E4:2", 120)
print(res)
`,
      'device-audio-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Saved');

    const wav = readWav('device-audio-test', 'C:\\test_song.wav');
    expect(wav.startsWith('RIFF')).toBe(true);
    expect(hasAudioData(wav)).toBe(true);
  });

  it('honours keyword arguments instead of degrading to NaN', () => {
    const res = run(
      `
import music
count = music.play_melody("C4:1 D4:1 E4:1", bpm=130, wave="sawtooth")
print("notes:", count)
music.play_chord(["C4", "E4", "G4"], duration_ms=600, wave="triangle")
music.play_note("A4", wave="sine")
print("ok")
`,
      'device-kwarg-test',
    );
    expect(res.error).toBeUndefined();
    // A dropped keyword previously produced zero-length notes and a
    // "TimeoutNaNWarning: NaN is not a number" from the scheduler.
    expect(res.output).toContain('notes: 3');
    expect(res.output).toContain('ok');
  });

  it('exports a WAV whose length reflects the requested tempo', () => {
    // Regression: `save_wav(..., bpm=120)` used to write a 44-byte, silent file
    // because the keyword became NaN and every note collapsed to zero samples.
    const res = run(
      `import music\nprint(music.save_wav("tempo.wav", "C4:4", bpm=240))`,
      'device-tempo-test',
    );
    expect(res.error).toBeUndefined();
    const wav = readWav('device-tempo-test', 'C:\\tempo.wav');
    expect(wav.length).toBeGreaterThan(44);
    expect(hasAudioData(wav)).toBe(true);
    // 240bpm -> 1000ms slot; 120bpm (the dropped-keyword fallback) -> 2000ms.
    expect(wav.length).toBeLessThan(60000);
  });

  it('accepts the notes= keyword form of save_wav', () => {
    const res = run(
      `import audio\nprint(audio.save_wav("kw_notes.wav", notes=["C4", "E4", "G4"], bpm=120))`,
      'device-kw-notes-test',
    );
    expect(res.error).toBeUndefined();
    const wav = readWav('device-kw-notes-test', 'C:\\kw_notes.wav');
    expect(hasAudioData(wav)).toBe(true);
  });

  it('renders chords, progressions, scales and arpeggios', () => {
    const res = run(
      `
import music
print("chord-symbol:", music.chord_notes("Cmaj7"))
print("scale:", music.scale_notes("A", "major", 3))
print("progression:", music.play_progression("C:1 Am:1 F:1 G:1", bpm=100, wave="square"))
print("scale-played:", music.play_scale("C", scale="major", count=8, bpm=140))
print("arp:", music.play_arpeggio("Aminor", bpm=160, mode="updown"))
`,
      'device-music-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain("['C4', 'E4', 'G4', 'B4']");
    // A major is A-B-C#, so the third degree is C#5.
    expect(res.output).toContain("['A4', 'B4', 'C#5']");
    expect(res.output).toContain('progression: 12');
    expect(res.output).toContain('scale-played: 8');
    // A minor is a triad, so an up-down arpeggio is A-C-E-C (4 notes).
    expect(res.output).toContain('arp: 4');
  });

  it('lists the available presets, scales, chords and waveforms', () => {
    const res = run(
      `
import music
print(len(music.list_sfx()) > 5)
print("major" in music.list_scales())
print(len(music.list_chords()) > 10)
print(music.list_waves())
`,
      'device-list-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('True');
    expect(res.output).toContain("['sine', 'square', 'sawtooth', 'triangle', 'noise']");
  });

  it('honours a zero volume, which a truthiness check used to discard', () => {
    const res = run(
      `import music\nmusic.set_volume(0)\nprint(music.get_volume())\nmusic.set_volume(0.6)\nprint(music.get_volume())`,
      'device-volume-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('0');
    expect(res.output).toContain('0.6');
  });

  it('mutes and unmutes the engine', () => {
    const res = run(`import music\nprint(music.mute())\nprint(music.unmute())`, 'device-mute-test');
    expect(res.error).toBeUndefined();
    expect(res.output.trim().split(/\r?\n/).slice(-2)).toEqual(['True', 'True']);
  });
});

describe('Synth and Track classes', () => {
  it('supports Synth class and ADSR parameters in Python', () => {
    const res = run(
      `
from synth import Synth

lead = Synth("sawtooth", 0.7)
lead.play_note("A4", 150)
lead.play_chord(["A4", "C#5", "E5"], 200)
print("Synth Success")
`,
      'device-synth-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Synth Success');
  });

  it('binds keywords on Synth methods and on the constructor', () => {
    const res = run(
      `
from synth import Synth

lead = Synth(waveform="square", volume=0.3)
lead.set_adsr(attack=10, decay=80, sustain=0.25, release=300)
lead.play_note("A4", duration_ms=400)
lead.play_melody("C4:1 D4:1", bpm=200)
print("adsr:", lead.attack, lead.sustain)
print("ok")`,
      'device-synth-kwarg-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('adsr: 10 0.25');
    expect(res.output).toContain('ok');
  });

  it('builds and plays a Track, reporting its timeline length', () => {
    const res = run(
      `
from music import Track

song = Track("Demo", 120)
song.add("C4", 1)
song.add("E4", 1)
song.add("G4", 2)
song.play()
print("name:", song.name)
print("ms:", song.duration_ms())
`,
      'device-track-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('name: Demo');
    // 500ms per beat at 120bpm, held for 92% by the articulation gate.
    // C4(0..460) E4(500..960) G4(1000..1920) -> the timeline ends at 1920ms.
    expect(res.output).toContain('ms: 1920');
  });

  it('appends a whole melody to a track', () => {
    const res = run(
      `from music import Track\nt = Track(bpm=60)\nt.add_melody("C4:1 D4:1 E4:2")\nprint("ms:", t.duration_ms())`,
      'device-track-melody-test',
    );
    expect(res.error).toBeUndefined();
    // 1000ms per beat at 60bpm: C4(0..920) D4(1000..1920) E4(2000..3840).
    // The gate must be applied once, not compounded per note.
    expect(res.output).toContain('ms: 3840');
  });
});

describe('winsound compatibility shim', () => {
  it('exposes Beep, MessageBeep, PlaySound and the SND_ constants', () => {
    const res = run(
      `
from winsound import Beep, MessageBeep, PlaySound, SND_PURGE
Beep(880, 120)
MessageBeep(0)
PlaySound("ding")
print("purge:", SND_PURGE)
print("winsound ok")
`,
      'device-winsound-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('purge: 64');
    expect(res.output).toContain('winsound ok');
  });
});

describe('input hardening', () => {
  it('falls back to defaults for unusable tempo, volume and waveform values', () => {
    const res = run(
      `
import music
print(music.play_melody("C4:1 D4:1", bpm="fast"))
print(music.set_volume("loud"))
print(music.set_wave("kazoo"))
print(music.play_sfx("nonexistent-sound"))
print(music.play_chord(["C4", "Q9"]))
print("survived")
`,
      'device-hardening-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('2');
    expect(res.output).toContain('0.5');
    expect(res.output).toContain('sine');
    expect(res.output).toContain('survived');
  });

  it('never produces an unwritable silent export for a valid melody', () => {
    const res = run(
      `import music\nprint(music.save_wav("rests.wav", "R:1 R:1"))`,
      'device-rest-export-test',
    );
    expect(res.error).toBeUndefined();
    const wav = readWav('device-rest-export-test', 'C:\\rests.wav');
    // An all-rest sequence has nothing to render but still writes a valid file.
    expect(wav.length).toBe(44);
    expect(hasAudioData(wav)).toBe(false);
  });

  it('reports a failure instead of claiming success for an unwritable path', () => {
    const res = run(
      `import music\nprint(music.save_wav("missing_dir/song.wav", "C4:1", bpm=120))`,
      'device-badpath-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Failed to save');
  });
});

describe('documented template', () => {
  it('runs the Audio & Music Synth sample end to end', () => {
    const res = run(
      `
import music

print("Muzik ve ses sentezleyici baslatiliyor...")

music.play_sfx("coin")
music.play_chord(["C4", "E4", "G4"], duration_ms=600, wave="triangle")
music.play_chord("Cmaj7", duration_ms=600, wave="sine")
music.play_progression("C:1 Am:1 F:1 G:1", bpm=100, wave="square")
music.play_scale("C", scale="major", count=8, bpm=140)
music.play_arpeggio("Aminor", bpm=160, wave="sawtooth", mode="updown")

lead = music.Synth("sawtooth", 0.6)
lead.set_adsr(attack=20, decay=120, sustain=0.4, release=250)
lead.play_melody("A4:1 C5:1 E5:1 D5:2", bpm=120)

music.play_melody("C4:1 D4:1 E4:1 C4:1 E4:1 F4:1 G4:2", bpm=130, wave="sawtooth", gate=0.6)

print("A major tonlama:", music.scale_notes("A", "major", 3))
print("F#dim7 akoru:", music.chord_notes("F#dim7"))
print(music.save_wav("melodi.wav", "C4:1 E4:1 G4:1 C5:2", bpm=120, wave="triangle"))
`,
      'device-template-test',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Muzik ve ses sentezleyici baslatiliyor...');
    expect(res.output).toContain("['A4', 'B4', 'C#5']");
    expect(res.output).toContain("['F#4', 'A4', 'C5', 'D#5']");
    expect(res.output).toContain('Saved');
    expect(hasAudioData(readWav('device-template-test', 'C:\\melodi.wav'))).toBe(true);
  });
});

describe('WAV file playback', () => {
  it('plays back a file that save_wav just wrote', () => {
    const res = run(
      `
import audio
print(audio.save_wav("kayit.wav", "C4:1 E4:1", bpm=120))
print(audio.play_wav("kayit.wav"))
`,
      'device-wav-roundtrip',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Saved');
    expect(res.output).toContain('Playing C:\\kayit.wav');
    expect(res.output).toContain('22050 Hz, mono, 16-bit pcm');
  });

  it('accepts a drive-qualified path written with forward slashes', () => {
    // The virtual filesystem treats / and \ alike, and forward slashes keep
    // the test free of backslash-escaping noise.
    const res = run(
      `
import audio
audio.save_wav("C:/ton.wav", "G4:1", bpm=120)
print(audio.play_wav("C:/ton.wav"))
`,
      'device-wav-qualified',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Playing C:/ton.wav');
  });

  it('reports a missing file instead of playing a fallback sound', () => {
    const res = run(`import audio\nprint(audio.play_wav("yok.wav"))`, 'device-wav-missing');
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('cannot read C:\\yok.wav (file not found)');
  });

  it('rejects a file that is not decodable WAV data', () => {
    const res = run(
      `
f = open("C:/notlar.txt", "w")
f.write("bu bir wav dosyasi degil")
f.close()
import audio
print(audio.play_wav("C:/notlar.txt"))
`,
      'device-wav-notaudio',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('is not a decodable WAV file');
  });

  it('requires a file name', () => {
    const res = run(`import audio\nprint(audio.play_wav())`, 'device-wav-empty');
    expect(res.output).toContain('play_wav: no file name given');
  });

  it('lets winsound.PlaySound load a real path, not just preset names', () => {
    const res = run(
      `
import audio, winsound
audio.save_wav("C:/alarm.wav", "A4:1", bpm=120)
print("path:", winsound.PlaySound("C:/alarm.wav"))
print("preset:", winsound.PlaySound("coin"))
print("missing:", winsound.PlaySound("C:/yok.wav"))
`,
      'device-winsound',
    );
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('path: True');
    expect(res.output).toContain('preset: True');
    // A path that cannot be loaded reports failure rather than silently
    // falling back to a beep, which is what the old shim did.
    expect(res.output).toContain('missing: False');
  });
});
