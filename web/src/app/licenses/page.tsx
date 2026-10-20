import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { LicensesScreen } from '@/features/privacy/components/LicensesScreen';

export const metadata: Metadata = { title: COPY.licenses.title };

const LicensesPage = (): ReactElement => <LicensesScreen />;

export default LicensesPage;
