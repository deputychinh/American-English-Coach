/** web/public/voice/manifest.json, written by backend/scripts/build_reference_voices.py. */
export interface VoiceManifest {
  model: string;
  disclosure: string;
  primary: string;
  extra: string[];
  clips: Record<string, string>;
}
