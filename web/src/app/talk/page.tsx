import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { TalkScreen } from '@/features/talk/components/TalkScreen';

export const metadata: Metadata = { title: COPY.talk.title };

const TalkPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <TalkScreen />
  </Suspense>
);

export default TalkPage;
