import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Page } from '@playwright/test';

/**
 * WebKit has no fake capture device (Chromium's `--use-file-for-fake-audio-capture`), so the
 * page's `getUserMedia` is replaced by a stream that plays a WAV on a loop through Web Audio.
 * Video requests get a blank canvas track, enough for screens that also open the camera.
 */
export const installFakeMic = async (page: Page, wav = 'e2e/fixtures/think.wav'): Promise<void> => {
  const base64 = readFileSync(resolve(wav)).toString('base64');
  await page.addInitScript((data: string) => {
    const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
    // WebKit ignores a plain assignment on the instance, so the prototype method is redefined.
    const fake = async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(bytes.slice().buffer);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      source.start();
      const tracks = constraints?.audio ? destination.stream.getAudioTracks() : [];
      if (constraints?.video) {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        canvas.getContext('2d')?.fillRect(0, 0, 320, 240);
        tracks.push(...canvas.captureStream(15).getVideoTracks());
      }
      return new MediaStream(tracks);
    };
    Object.defineProperty(MediaDevices.prototype, 'getUserMedia', {
      configurable: true,
      value: fake,
    });
  }, base64);
};
