import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const outputDir = resolve(root, "public/audio");
const sampleRate = 48000;
mkdirSync(outputDir, {recursive: true});

const writeWav = (name, duration, sampleAt) => {
  const sampleCount = Math.floor(sampleRate * duration);
  const channels = 2;
  const dataSize = sampleCount * channels * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index++) {
    const time = index / sampleRate;
    const [left, right = left] = sampleAt(time, index);
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(left * 32767))), 44 + index * 4);
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(right * 32767))), 46 + index * 4);
  }

  writeFileSync(resolve(outputDir, name), buffer);
};

const chords = [
  [110, 164.81, 220],
  [98, 146.83, 196],
  [130.81, 196, 261.63],
  [87.31, 130.81, 174.61],
];

writeWav("merge-queue-bed.wav", 120, (time) => {
  const chord = chords[Math.floor(time / 15) % chords.length];
  const fadeIn = Math.min(1, time / 2.5);
  const fadeOut = Math.min(1, (120 - time) / 3);
  const pulse = 0.74 + 0.26 * Math.sin(Math.PI * 2 * time / 8);
  const tone = chord.reduce((sum, frequency, index) => {
    const fundamental = Math.sin(Math.PI * 2 * frequency * time + index * 0.7);
    const harmonic = Math.sin(Math.PI * 2 * frequency * 2 * time + index * 1.1) * 0.18;
    return sum + fundamental + harmonic;
  }, 0) / chord.length;
  const air = Math.sin(Math.PI * 2 * 523.25 * time) * 0.025;
  const value = (tone * 0.22 + air) * pulse * fadeIn * fadeOut;
  return [value * 0.96, value];
});

writeWav("ui-click.wav", 0.16, (time) => {
  const envelope = Math.exp(-time * 34);
  const value = (Math.sin(Math.PI * 2 * 760 * time) + Math.sin(Math.PI * 2 * 1240 * time) * 0.35) * envelope * 0.5;
  return [value, value * 0.9];
});

writeWav("merge-reveal.wav", 1.4, (time) => {
  const envelope = Math.sin(Math.min(1, time / 0.22) * Math.PI / 2) * Math.max(0, 1 - time / 1.4);
  const frequency = 240 + time * 520;
  const value = Math.sin(Math.PI * 2 * frequency * time) * envelope * 0.3;
  return [value * 0.88, value];
});

writeWav("commit.wav", 1.6, (time) => {
  const envelope = Math.exp(-time * 2.3) * Math.min(1, time / 0.025);
  const value =
    (Math.sin(Math.PI * 2 * 261.63 * time) +
      Math.sin(Math.PI * 2 * 329.63 * time) * 0.82 +
      Math.sin(Math.PI * 2 * 392 * time) * 0.72) *
    envelope *
    0.16;
  return [value, value * 0.94];
});

console.log("Generated original sound design in", outputDir);
