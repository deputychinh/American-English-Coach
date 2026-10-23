import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';
import { VocabScreen } from '@/features/vocab/components/VocabScreen';

export const metadata: Metadata = { title: COPY.vocab.title };

const VocabPage = (): ReactElement => <VocabScreen />;

export default VocabPage;
