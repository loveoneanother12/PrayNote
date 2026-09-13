import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./visual-system.css";
import "./challenge.css";
import { NetworkStatusDialog } from "@/components/network-status-dialog";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "PrayNote — 함께 기도하는 공간",
  description: "신뢰하는 공동체 안에서 기도제목을 나누고 함께 기도해요.",
  applicationName: "PrayNote",
  alternates: { canonical: "/" },
  manifest: "/manifest-20260912.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PrayNote",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192-20260912.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512-20260912.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-20260912.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#586fd2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>{children}<NetworkStatusDialog /></body>
    </html>
  );
}
