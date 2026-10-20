import type { MouthFrame } from '@/interfaces/mouth.interface';

/** The fields the scorer reads from a tracked frame (the lip outline stays on the device). */
export const toMouthPayload = ({ t, features, quality }: MouthFrame): MouthFrame => ({
  t,
  features,
  quality,
});
