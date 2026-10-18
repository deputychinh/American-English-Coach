import type { ReactElement, ReactNode } from 'react';

import './PageIntro.css';

interface PageIntroProps {
  title: string;
  lead?: string;
  children?: ReactNode;
  /** Small control beside the title (an icon button), kept on the title row on phones. */
  aside?: ReactNode;
}

/** Page heading with an optional lead paragraph and actions. */
export const PageIntro = ({ title, lead, children, aside }: PageIntroProps): ReactElement => (
  <header className="page-intro">
    <div className="page-intro__text">
      <div className="page-intro__title-row">
        <h1 className="page-intro__title">{title}</h1>
        {aside}
      </div>
      {lead ? <p className="page-intro__lead">{lead}</p> : null}
    </div>
    {children ? <div className="page-intro__actions">{children}</div> : null}
  </header>
);
