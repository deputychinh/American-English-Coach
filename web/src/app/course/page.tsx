import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { CourseScreen } from '@/features/course/components/CourseScreen';

export const metadata: Metadata = { title: COPY.course.title };

const CoursePage = (): ReactElement => <CourseScreen />;

export default CoursePage;
