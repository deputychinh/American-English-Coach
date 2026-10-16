import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { MouthMirror } from '@/features/mirror/components/MouthMirror';

export const metadata: Metadata = { title: COPY.mirror.title };

const MirrorPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <MouthMirror />
  </Suspense>
);

export default MirrorPage;
