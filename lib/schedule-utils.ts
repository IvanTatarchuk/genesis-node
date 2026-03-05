export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function formatNextRun(dateStr: string | null): string {
  if (!dateStr) return "Not scheduled";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH  = Math.round(diffMs / (1000 * 60 * 60));
  const diffD  = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0)           return "Overdue";
  if (diffH < 1)            return "< 1 hour";
  if (diffH < 24)           return `in ${diffH}h`;
  if (diffD === 1)          return "tomorrow";
  if (diffD < 7)            return `in ${diffD} days`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, "0")}:00`,
}));

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];
