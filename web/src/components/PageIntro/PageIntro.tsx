import type { ReactElement, ReactNode } from 'react';

import './PageIntro.css';

interface PageIntroProps {
  title: string;
  lead?: string;
  children?: ReactNode;
}

/** Page heading with an optional lead paragraph and actions. */
export const PageIntro = ({ title, lead, children }: PageIntroProps): ReactElement => (
  <header className="page-intro">
    <div className="page-intro__text">
      <h1 className="page-intro__title">{title}</h1>
      {lead ? <p className="page-intro__lead">{lead}</p> : null}
    </div>
    {children ? <div className="page-intro__actions">{children}</div> : null}
  </header>
);
