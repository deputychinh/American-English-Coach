import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Synthesises the word the fake microphone will "speak" (macOS `say`); skipped elsewhere. */
const globalSetup = (): void => {
  const target = resolve('e2e/fixtures/think.wav');
  if (existsSync(target)) return;
  mkdirSync(dirname(target), { recursive: true });
  try {
    execFileSync('say', ['-v', 'Samantha', '-o', target, '--data-format=LEI16@16000', 'think']);
  } catch {
    // Without `say` Chrome falls back to its synthetic beep; the smoke test tolerates both.
  }
};

export default globalSetup;
