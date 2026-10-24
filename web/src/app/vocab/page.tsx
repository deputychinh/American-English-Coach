import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { VocabScreen } from '@/features/vocab/components/VocabScreen';

export const metadata: Metadata = { title: COPY.vocab.title };

const VocabPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <VocabScreen />
  </Suspense>
);

export default VocabPage;
