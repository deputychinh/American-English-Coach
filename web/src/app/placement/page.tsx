import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { PlacementScreen } from '@/features/placement/components/PlacementScreen';

export const metadata: Metadata = { title: COPY.placement.title };

const PlacementPage = (): ReactElement => <PlacementScreen />;

export default PlacementPage;
