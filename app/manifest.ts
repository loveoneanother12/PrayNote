import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrayNote — 함께 기도하는 공간",
    short_name: "PrayNote",
    description: "신뢰하는 공동체 안에서 기도제목을 나누고 함께 기도해요.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#586fd2",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
