import { IconName } from '@/enums/icon-name.enum';

/** Primary destinations, in tab order. Labels come from the copy dictionary by `key`. */
export const NAV_ITEMS = [
  { key: 'home', href: '/', icon: IconName.Home },
  { key: 'practice', href: '/practice', icon: IconName.Practice },
  { key: 'sounds', href: '/sounds', icon: IconName.Sounds },
  { key: 'mirror', href: '/mirror', icon: IconName.Mirror },
  { key: 'progress', href: '/progress', icon: IconName.Progress },
] as const;
