import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { SettingsScreen } from '@/features/settings/components/SettingsScreen';

export const metadata: Metadata = { title: COPY.settings.title };

const SettingsPage = (): ReactElement => <SettingsScreen />;

export default SettingsPage;
