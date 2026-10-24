import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { FluencyScreen } from '@/features/fluency/components/FluencyScreen';

export const metadata: Metadata = { title: COPY.fluency.title };

const FluencyPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <FluencyScreen />
  </Suspense>
);

export default FluencyPage;
