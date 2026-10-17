import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { CurriculumScreen } from '@/features/curriculum/components/CurriculumScreen';

export const metadata: Metadata = { title: COPY.curriculum.title };

const CurriculumPage = (): ReactElement => <CurriculumScreen />;

export default CurriculumPage;
