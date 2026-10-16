import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { ProgressDashboard } from '@/features/progress/components/ProgressDashboard';

export const metadata: Metadata = { title: COPY.progress.title };

const ProgressPage = (): ReactElement => <ProgressDashboard />;

export default ProgressPage;
