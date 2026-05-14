export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type Day = (typeof DAYS)[number];

export const DAY_LABELS: Record<Day, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
};

export function computeWeekdayMask(days: Record<Day, boolean>): number {
  return DAYS.reduce((m, d, i) => m | (days[d] ? 1 << i : 0), 0);
}

export function maskToDays(mask: number): Record<Day, boolean> {
  return Object.fromEntries(
    DAYS.map((d, i) => [d, (mask & (1 << i)) !== 0]),
  ) as Record<Day, boolean>;
}

export function maskToLabel(mask: number): string {
  if (mask === 0b1111111) return 'Every day';
  if (mask === 0b0111110) return 'Weekdays';
  if (mask === 0b1000001) return 'Weekends';
  return DAYS.filter((_, i) => (mask & (1 << i)) !== 0)
    .map((d) => DAY_LABELS[d])
    .join(', ');
}
