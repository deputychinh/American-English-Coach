import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { SoundChart } from '@/features/sounds/components/SoundChart';

export const metadata: Metadata = { title: COPY.sounds.title };

const SoundsPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <SoundChart />
  </Suspense>
);

export default SoundsPage;
