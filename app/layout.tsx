import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pronosticos Mundial",
  description: "App familiar de pronosticos para el Mundial 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
