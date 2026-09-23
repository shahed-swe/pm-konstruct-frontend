import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Ships the server and only the traced dependencies, so the production
  // image carries neither the source nor the full node_modules tree.
  output: "standalone",
  // The API is a separate service. In development it runs on 8081; in
  // production the two sit behind one origin, which is why the client always
  // calls a same-origin `/api` path and never a hardcoded host.
  //
  // `PMK_API_URL` is read **when this file is evaluated**, and for a
  // production build that is at `next build` time -- the result is written
  // into `.next/routes-manifest.json` and cannot change afterwards. Setting
  // it in the container's environment does nothing; it has to be a build
  // argument. `next dev` re-evaluates on every start, so development is
  // unaffected either way.
  async rewrites() {
    const target = process.env.PMK_API_URL ?? "http://127.0.0.1:8081";
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default config;
