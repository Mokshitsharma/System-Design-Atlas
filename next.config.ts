import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Old URLs from the first version of the site keep working.
  async redirects() {
    return [
      { source: "/platforms", destination: "/system-design", permanent: true },
      { source: "/platforms/:slug", destination: "/system-design/:slug", permanent: true },
      { source: "/categories/:slug", destination: "/system-design?category=:slug", permanent: true },
      { source: "/sources", destination: "/about", permanent: true },
      { source: "/:path(roadmap|progress|failures|practice)", destination: "/", permanent: false },
      { source: "/practice/:slug", destination: "/", permanent: false },
    ];
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
