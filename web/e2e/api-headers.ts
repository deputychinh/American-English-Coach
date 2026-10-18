import { e2eDeviceToken } from './env';

/** Headers for direct API calls from a test: the phone-mode token when global-setup paired. */
export const apiHeaders = (): Record<string, string> => {
  const token = e2eDeviceToken();
  return token ? { 'X-Coach-Token': token } : {};
};
