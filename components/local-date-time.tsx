"use client";

type LocalDateTimeProps = {
  value: string;
  variant?: "short" | "full";
};

export function formatMatchDayLabel(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function LocalDateTime({ value, variant = "short" }: LocalDateTimeProps) {
  const date = new Date(value);
  const formatted =
    variant === "full"
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date)
      : new Intl.DateTimeFormat(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
