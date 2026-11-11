import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components dimatikan agar pola data tetap sederhana (semua halaman dinamis).
  // Bisa diaktifkan nanti setelah aplikasi stabil.
  cacheComponents: false,
  // sembunyikan ikon "N" Next.js di pojok kiri bawah saat npm run dev
  devIndicators: false,
  experimental: {
    // upload lampiran maks. 10 MB (+ ruang untuk header multipart)
    serverActions: { bodySizeLimit: "11mb" },
    proxyClientMaxBodySize: "12mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
