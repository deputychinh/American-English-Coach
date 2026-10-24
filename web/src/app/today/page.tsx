import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { TodayScreen } from '@/features/today/components/TodayScreen';

export const metadata: Metadata = { title: COPY.session.title };

const TodayPage = (): ReactElement => <TodayScreen />;

export default TodayPage;
