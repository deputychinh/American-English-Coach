import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { ListenScreen } from '@/features/listen/components/ListenScreen';

export const metadata: Metadata = { title: COPY.listen.title };

const ListenPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <ListenScreen />
  </Suspense>
);

export default ListenPage;
