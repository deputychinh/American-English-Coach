import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { PracticeScreen } from '@/features/practice/components/PracticeScreen';

export const metadata: Metadata = { title: COPY.practice.title };

const PracticePage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <PracticeScreen />
  </Suspense>
);

export default PracticePage;
