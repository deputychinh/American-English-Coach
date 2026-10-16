import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { CalibrationFlow } from '@/features/calibration/components/CalibrationFlow';

export const metadata: Metadata = { title: COPY.calibration.title };

const CalibrationPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={4} />}>
    <CalibrationFlow />
  </Suspense>
);

export default CalibrationPage;
