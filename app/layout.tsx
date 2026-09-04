import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrayNote — 함께 기도하는 공간",
  description: "신뢰하는 공동체 안에서 기도제목을 나누고 함께 기도해요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
