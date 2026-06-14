"use client";

type LocalDateTimeProps = {
  value: string;
  variant?: "short" | "full";
};

export function LocalDateTime({ value, variant = "short" }: LocalDateTimeProps) {
  const date = new Date(value);
  const formatted =
    variant === "full"
      ? new Intl.DateTimeFormat("es-AR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date)
      : new Intl.DateTimeFormat("es-AR", {
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
