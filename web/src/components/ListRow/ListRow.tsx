import Link from 'next/link';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';

import './ListRow.css';

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  /** Round icon badge in place of `leading` (home's entries). */
  icon?: IconName;
  trailing?: ReactNode;
  href?: ComponentProps<typeof Link>['href'];
}

/** One tappable row of a list; renders a link when `href` is given, otherwise a static row. */
export const ListRow = ({
  title,
  subtitle,
  leading,
  icon,
  trailing,
  href,
}: ListRowProps): ReactElement => {
  const body = (
    <>
      {icon ? (
        <span className="list-row__icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      ) : leading ? (
        <span className="list-row__leading">{leading}</span>
      ) : null}
      <span className="list-row__text">
        <span className="list-row__title">{title}</span>
        {subtitle ? <span className="list-row__subtitle">{subtitle}</span> : null}
      </span>
      <span className="list-row__trailing">
        {trailing}
        {href ? <Icon name={IconName.ArrowRight} className="list-row__chevron" /> : null}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="list-row list-row--link">
        {body}
      </Link>
    );
  }
  return <div className="list-row">{body}</div>;
};
