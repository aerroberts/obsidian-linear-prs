export type MergeDay = { date: string; count: number };

export function mergeWindow(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 13);
  return start;
}

export function dailyMerges(mergedDates: string[], now = new Date()): MergeDay[] {
  const start = mergeWindow(now);
  const days: MergeDay[] = [];
  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  for (let i = 0; i < 14; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    days.push({ date: dayKey(day), count: 0 });
  }
  for (const value of mergedDates) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date > now) {
      continue;
    }
    const day = days.find((day) => day.date === dayKey(date));
    if (day) {
      day.count++;
    }
  }
  return days;
}
