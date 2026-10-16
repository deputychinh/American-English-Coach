/** Vietnamese short date-time for history rows (UTC ISO input from the API). */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const formatPercent = (part: number, total: number): string =>
  total === 0 ? '0%' : `${Math.round((part / total) * 100)}%`;
