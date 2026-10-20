import { registerPlugin } from '@capacitor/core';

import type { PhonemeEnginePlugin } from '@/interfaces/engine.interface';
import { isNativeShell } from '@/utils/api-base.util';

/** Native on-device phoneme model; only the iOS shell implements it. */
export const PhonemeEngine = registerPlugin<PhonemeEnginePlugin>('PhonemeEngine');

export const isEngineAvailable = (): boolean => isNativeShell();
