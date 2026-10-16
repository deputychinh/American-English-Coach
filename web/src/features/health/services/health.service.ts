import { api } from '@/api/client';
import type { HealthResponse } from '@/interfaces/practice.interface';

/** `null` means the API is unreachable (the app stays browsable). */
export const getHealth = async (): Promise<HealthResponse | null> => {
  try {
    const { data } = await api.GET('/api/v1/health');
    return data ?? null;
  } catch {
    return null;
  }
};
