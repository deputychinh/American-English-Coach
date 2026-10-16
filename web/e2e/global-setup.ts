import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SAMPLE_RATE = 16_000;
const SECONDS = 1.5;

/** A 16 kHz PCM16 WAV of a soft 150 Hz tone: voiced-looking audio for machines without `say`. */
const toneWav = (): Buffer => {
  const frames = Math.round(SAMPLE_RATE * SECONDS);
  const data = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i += 1) {
    const envelope = Math.min(1, i / 800, (frames - i) / 800);
    const sample = 0.25 * envelope * Math.sin((2 * Math.PI * 150 * i) / SAMPLE_RATE);
    data.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

/** Produces the word the fake microphone "speaks": macOS `say` when available, else a tone. */
const globalSetup = (): void => {
  const target = resolve('e2e/fixtures/think.wav');
  if (existsSync(target)) return;
  mkdirSync(dirname(target), { recursive: true });
  try {
    execFileSync('say', ['-v', 'Samantha', '-o', target, '--data-format=LEI16@16000', 'think']);
  } catch {
    writeFileSync(target, toneWav());
  }
  if (!existsSync(target)) writeFileSync(target, toneWav());
};

export default globalSetup;
