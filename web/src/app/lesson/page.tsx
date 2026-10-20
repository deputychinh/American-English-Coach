import type { Metadata } from 'next';
import { type ReactElement, Suspense } from 'react';

import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { LessonPlayer } from '@/features/lesson/components/LessonPlayer';

export const metadata: Metadata = { title: COPY.lesson.title };

const LessonPage = (): ReactElement => (
  <Suspense fallback={<Skeleton lines={6} />}>
    <LessonPlayer />
  </Suspense>
);

export default LessonPage;
