'use client';

import { useCallback, useEffect, useState } from 'react';

import { loadCalibration } from '@/features/mirror/services/calibration.service';
import type { CalibrationState } from '@/interfaces/hooks.interface';
import type { Calibration } from '@/interfaces/mouth.interface';

export const useCalibration = (): CalibrationState => {
  const [value, setValue] = useState<Calibration | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    loadCalibration()
      .then((loaded) => {
        if (active) {
          setValue(loaded);
          setIsLoaded(true);
        }
      })
      .catch(() => {
        if (active) setIsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { value, isLoaded, reload };
};
