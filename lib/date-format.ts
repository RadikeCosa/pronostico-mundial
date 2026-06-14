export function formatMatchDayLabel(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}
