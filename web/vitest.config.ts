import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // jsdom's fetch needs absolute URLs; the mock in test-utils routes by pathname anyway.
    env: { NEXT_PUBLIC_API_BASE_URL: 'http://localhost' },
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Route files and next-intl wiring are covered by the build and e2e; declarations hold no logic.
      // Routes are covered by the build and e2e; camera/microphone/MediaPipe glue and the
      // service worker registration need real browser APIs and are covered by the Playwright smoke.
      exclude: [
        'src/api/**',
        'src/app/**',
        'src/config/**',
        'src/**/index.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.constant.ts',
        'src/**/*.enum.ts',
        'src/**/*.interface.ts',
        'src/test-utils/**',
        'src/components/RegisterServiceWorker/**',
        'src/features/mirror/hooks/useMouthTracker.ts',
        'src/features/mirror/hooks/useFaceLandmarker.ts',
        'src/features/mirror/hooks/useSuccessChime.ts',
        'src/features/mirror/components/CameraPanel.tsx',
        'src/features/mirror/components/LipOutlineCanvas.tsx',
        'src/features/mirror/components/MouthMirror.tsx',
        'src/features/calibration/**',
        'src/features/practice/hooks/useRecorder.ts',
        'src/features/practice/hooks/useReferenceAudio.ts',
        'src/features/practice/components/PracticeSession.tsx',
        'src/features/practice/components/DrillSession.tsx',
        'src/features/tutor/components/MouthTutorButton.tsx',
      ],
      thresholds: { lines: 80 },
    },
  },
});
