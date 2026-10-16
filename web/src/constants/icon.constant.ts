import { IconName } from '@/enums/icon-name.enum';

/** 24×24 stroke icons (Lucide-style geometry, hand-trimmed). Paths only; colour comes from CSS. */
export const ICON_PATHS: Record<IconName, string> = {
  [IconName.Home]: 'M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z',
  [IconName.Practice]:
    'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM19 11a7 7 0 0 1-14 0M12 18v3M8 21h8',
  [IconName.Sounds]: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  [IconName.Mirror]: 'M4 7h3l2-2h6l2 2h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  [IconName.Progress]: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  [IconName.Settings]:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  [IconName.Play]: 'M7 4l13 8-13 8z',
  [IconName.Stop]: 'M6 6h12v12H6z',
  [IconName.Record]: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  [IconName.Check]: 'M5 12l5 5L20 7',
  [IconName.Alert]:
    'M12 9v4M12 17h.01M10.3 3.9L2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  [IconName.Close]: 'M6 6l12 12M18 6L6 18',
  [IconName.Sun]:
    'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  [IconName.Moon]: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  [IconName.ArrowRight]: 'M5 12h14M13 6l6 6-6 6',
  [IconName.ChevronLeft]: 'M15 6l-6 6 6 6',
  [IconName.Search]: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  [IconName.Sparkles]:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z',
  [IconName.Refresh]: 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  [IconName.Camera]: 'M4 8h4l2-3h4l2 3h4v11H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  [IconName.Info]: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
};
