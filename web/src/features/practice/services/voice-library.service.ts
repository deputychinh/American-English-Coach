import type { VoiceManifest } from '@/interfaces/voice.interface';

/**
 * Model voices bundled with the app (backend/scripts/build_reference_voices.py): the manifest
 * maps a text to its clip in /voice/<primary>/. Without the manifest (development builds before
 * the voices are rendered) the player falls back to the scoring server.
 */

let manifest: Promise<VoiceManifest | null> | null = null;

const loadManifest = (): Promise<VoiceManifest | null> => {
  manifest ??= fetch('/voice/manifest.json')
    .then((response) => (response.ok ? (response.json() as Promise<VoiceManifest>) : null))
    .catch(() => null);
  return manifest;
};

/** URL of the bundled clip for a text, or null when the app has none. */
export const bundledClipUrl = async (text: string): Promise<string | null> => {
  const library = await loadManifest();
  const id = library?.clips[text] ?? library?.clips[text.trim()];
  return library && id ? `/voice/${library.primary}/${id}.m4a` : null;
};

/** Tests only. */
export const resetVoiceLibrary = (): void => {
  manifest = null;
};
