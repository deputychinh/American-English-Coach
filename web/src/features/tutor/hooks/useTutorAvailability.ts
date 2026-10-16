'use client';

import { getHealth } from '@/features/health/services/health.service';
import { useAsync } from '@/hooks/useAsync';
import type { TutorAvailability } from '@/interfaces/practice.interface';

/** Whether the optional LLM tutor is configured on the API host. */
export const useTutorAvailability = (): TutorAvailability => {
  const health = useAsync(getHealth);
  return {
    isAvailable: health.data?.tutor_available === true,
    model: health.data?.tutor_model ?? null,
  };
};
