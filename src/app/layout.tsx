import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon Mini-ERP",
  description: "Internal ERP for beauty salon"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
