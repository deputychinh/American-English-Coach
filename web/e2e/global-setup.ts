import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { e2eBaseUrl, e2ePairingCode, rememberDeviceToken } from './env';

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

/**
 * Phone mode (`E2E_PAIRING_CODE` set, API started with `COACH_TRUST_LOOPBACK=false`): pair once
 * like the iPhone does and give every test the token, so anything that skips it fails with 401.
 */
const pairLikeAPhone = async (code: string): Promise<void> => {
  const baseUrl = e2eBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, device_name: 'e2e' }),
  });
  if (!response.ok) throw new Error(`pairing failed: ${String(response.status)}`);
  const { token } = (await response.json()) as { token: string };
  // Workers inherit this, for tests that seed data through the API directly (see api-headers).
  rememberDeviceToken(token);
  const state = {
    cookies: [],
    origins: [
      {
        origin: baseUrl,
        localStorage: [
          { name: 'coach.deviceToken', value: JSON.stringify(token) },
          { name: 'coach.deviceName', value: JSON.stringify('e2e') },
        ],
      },
    ],
  };
  mkdirSync(dirname(resolve('e2e/.auth/device.json')), { recursive: true });
  writeFileSync(resolve('e2e/.auth/device.json'), JSON.stringify(state));
};

/** Produces the word the fake microphone "speaks": macOS `say` when available, else a tone. */
const writeFakeVoice = (): void => {
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

const globalSetup = async (): Promise<void> => {
  writeFakeVoice();
  const code = e2ePairingCode();
  if (code) await pairLikeAPhone(code);
};

export default globalSetup;
