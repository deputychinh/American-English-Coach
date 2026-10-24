'use client';

import type { ReactElement, ReactNode } from 'react';

import { LargeTitleBar } from '@/components/LargeTitleBar/LargeTitleBar';
import { useScrolledPast } from '@/hooks/useScrolledPast';

import './PageIntro.css';

interface PageIntroProps {
  title: string;
  lead?: string;
  children?: ReactNode;
  /** Small control beside the title (an icon button), kept on the title row on phones. */
  aside?: ReactNode;
}

/** Page heading with an optional lead paragraph and actions; an iOS large title on phones. */
export const PageIntro = ({ title, lead, children, aside }: PageIntroProps): ReactElement => {
  const [titleRef, isScrolledPast] = useScrolledPast<HTMLHeadingElement>();
  return (
    <header className="page-intro">
      <LargeTitleBar title={title} isShown={isScrolledPast} />
      <div className="page-intro__text">
        <div className="page-intro__title-row">
          <h1 ref={titleRef} className="page-intro__title">
            {title}
          </h1>
          {aside}
        </div>
        {lead ? <p className="page-intro__lead">{lead}</p> : null}
      </div>
      {children ? <div className="page-intro__actions">{children}</div> : null}
    </header>
  );
};
