import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { WelcomeFlow } from '@/features/onboarding/components/WelcomeFlow';

export const metadata: Metadata = { title: COPY.onboarding.title };

const WelcomePage = (): ReactElement => <WelcomeFlow />;

export default WelcomePage;
