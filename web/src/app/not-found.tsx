import Link from 'next/link';
import type { ReactElement } from 'react';

import { COPY } from '@/constants/copy.constant';

const NotFound = (): ReactElement => (
  <div className="stack">
    <h1>{COPY.common.notFound}</h1>
    <Link href="/">{COPY.common.backHome}</Link>
  </div>
);

export default NotFound;
