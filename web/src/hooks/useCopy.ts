import { useMemo } from 'react';

import { COPY } from '@/constants/copy.constant';
import type { Copy } from '@/interfaces/copy.interface';

/** Copy accessor for components; swapping locales later only touches this hook. */
export const useCopy = (): Copy => useMemo(() => COPY, []);
