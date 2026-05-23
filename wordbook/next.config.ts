import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverActions: {
      // Cloud Run の非公開サービスには `gcloud run services proxy` 経由で
      // アクセスするため、ブラウザの Origin は常に 127.0.0.1:8080 になる。
      // 一方、Cloud Run 側が見る X-Forwarded-Host は Cloud Run の本ホスト名。
      // Next.js 15 の Server Actions は両者の不一致を CSRF として弾くため、
      // proxy の Origin を明示的に許可する。
      allowedOrigins: ["127.0.0.1:8080", "localhost:8080"],
    },
  },
};

export default nextConfig;
