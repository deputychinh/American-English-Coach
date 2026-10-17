/** Vietnamese short date-time for history rows (UTC ISO input from the API). */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const formatPercent = (part: number, total: number): string =>
  total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`;

/** Vietnamese short date (no time) for lists. */
export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date);
};

/** Safe file-name stem from a learner-typed name. */
export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'profile';
