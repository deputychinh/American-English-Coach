import type { ReactElement, ReactNode } from 'react';

import './SectionHeader.css';

interface SectionHeaderProps {
  id: string;
  title: string;
  hint?: string;
  children?: ReactNode;
}

/** Heading row of a section or card: title, optional hint, optional action on the right. */
export const SectionHeader = ({ id, title, hint, children }: SectionHeaderProps): ReactElement => (
  <div className="section-header">
    <div className="section-header__text">
      <h2 id={id} className="section-header__title">
        {title}
      </h2>
      {hint ? <p className="section-header__hint">{hint}</p> : null}
    </div>
    {children ? <div className="section-header__actions">{children}</div> : null}
  </div>
);
