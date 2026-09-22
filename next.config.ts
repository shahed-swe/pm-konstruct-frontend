import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The API is a separate service. In development it runs on 8081; in
  // production the two sit behind one origin, which is why the client always
  // calls a same-origin `/api` path and never a hardcoded host.
  async rewrites() {
    const target = process.env.PMK_API_URL ?? "http://127.0.0.1:8081";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default config;
