import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sögur Forge",
  description: "A focused, self-hostable writing workspace for novelists.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
