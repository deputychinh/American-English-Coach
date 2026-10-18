/** The only place e2e code reads the environment (lint keeps `process.env` out of the rest). */

/** Server under test. */
export const e2eBaseUrl = (): string => process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8765';

/** Pairing code of an API started with `COACH_TRUST_LOOPBACK=false` (phone mode), or ''. */
export const e2ePairingCode = (): string => process.env.E2E_PAIRING_CODE ?? '';

/** Token global-setup obtained in phone mode; workers inherit it. '' otherwise. */
export const e2eDeviceToken = (): string => process.env.E2E_DEVICE_TOKEN ?? '';

export const rememberDeviceToken = (token: string): void => {
  process.env.E2E_DEVICE_TOKEN = token;
};
