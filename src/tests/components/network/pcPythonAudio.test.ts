import { describe, expect, it } from 'vitest';
import { executePythonScript } from '@/components/network/pc-panel/pcPythonRunner';
import { noteToFrequency, generateWavFile } from '@/components/network/pc-panel/pcAudioPlayer';
import { loadFs, readFile } from '@/components/network/pc-panel/pcFileSystem';

describe('Embedded Python Audio & Music Module (audio/music/synth)', () => {
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

    const headerStr = String.fromCharCode(...wav.slice(0, 4));
    expect(headerStr).toBe('RIFF');

    const waveStr = String.fromCharCode(...wav.slice(8, 12));
    expect(waveStr).toBe('WAVE');
  });

  it('executes python script with tones, chords, melodies, and WAV export', () => {
    const code = `
import music
from audio import play_tone, play_chord, play_sfx

# Play tone and chord
play_tone(440, 100)
play_chord(["C4", "E4", "G4"], 100)
play_sfx("coin")

# Export to WAV file
res = music.save_wav("test_song.wav", "C4:1 D4:1 E4:2", 120)
print(res)
`;

    const res = executePythonScript(code, [], undefined, 'device-audio-test');
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Saved');

    const fs = loadFs('device-audio-test');
    const wavContent = readFile(fs, 'C:\\test_song.wav');
    expect(wavContent).not.toBeNull();
    expect(wavContent?.startsWith('RIFF')).toBe(true);
  });

  it('supports Synth class and ADSR parameters in Python', () => {
    const code = `
from synth import Synth

lead = Synth("sawtooth", 0.7)
lead.play_note("A4", 150)
lead.play_chord(["A4", "C#5", "E5"], 200)
print("Synth Success")
`;

    const res = executePythonScript(code, [], undefined, 'device-synth-test');
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('Synth Success');
  });
});
