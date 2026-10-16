import { env } from '@/config/env';
import { API_TIMEOUT_MS } from '@/constants/api.constant';
import { createApiClient } from '@/utils/api-client.util';

import type { paths } from './coach.schema';

/** The one typed client every service uses. */
export const api = createApiClient<paths>({ baseUrl: env.apiBaseUrl, timeoutMs: API_TIMEOUT_MS });
