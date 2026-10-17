export const API_TIMEOUT_MS = 30_000;
export const PROGRESS_LIMIT = 20;
export const FOCUS_LIMIT = 2;
/** Where the iOS simulator finds the API running on the Mac (`make api`). */
export const NATIVE_DEFAULT_API_BASE_URL = 'http://127.0.0.1:8765';
/** Header carrying the pairing token on phones; loopback clients never need it. */
export const DEVICE_TOKEN_HEADER = 'X-Coach-Token';
/** Window event fired when the API answers 401 (device not paired). */
export const UNAUTHORIZED_EVENT = 'coach:unauthorized';
export const PAIR_CODE_LENGTH = 6;
/** Header naming the active learner profile; absent = the implicit default profile. */
export const PROFILE_HEADER = 'X-Coach-Profile';
export const DEFAULT_PROFILE_ID = 'default';
/** Window event fired when the active profile changes on this device. */
export const PROFILE_CHANGED_EVENT = 'coach:profile';
export const PROFILE_EXPORT_FORMAT = 'aec-profile/1';
