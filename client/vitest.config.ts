import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/contexts": path.resolve(__dirname, "./src/contexts"),
      "@/providers": path.resolve(__dirname, "./src/providers"),
      "@/styles": path.resolve(__dirname, "./src/styles"),
      "@/data": path.resolve(__dirname, "./src/data"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/constants": path.resolve(__dirname, "./src/constants"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Node 25+ では `--experimental-webstorage` が有効化されており、Vitest が
    // パスなしの `--localstorage-file` を Node に渡してしまう影響で、空の `{}`
    // が happy-dom の `window.localStorage` を shadow し、`setItem` 等が
    // undefined になる現象が発生する。Node のネイティブ webstorage を無効化し、
    // happy-dom の Storage 実装を使わせるためのワークアラウンド。
    // 前提: Node >= 25（package.json の engines で強制）。
    execArgv: ['--no-experimental-webstorage'],
  },
});
