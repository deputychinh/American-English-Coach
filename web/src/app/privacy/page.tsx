import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { PrivacyScreen } from '@/features/privacy/components/PrivacyScreen';

export const metadata: Metadata = { title: COPY.privacy.title };

const PrivacyPage = (): ReactElement => <PrivacyScreen />;

export default PrivacyPage;
