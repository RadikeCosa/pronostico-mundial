"use client";

type LocalDateTimeProps = {
  value: string;
};

export function LocalDateTime({ value }: LocalDateTimeProps) {
  const date = new Date(value);
  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
