import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La imagen Docker arranca con `node server.js`, que solo existe si el build
  // emite el servidor standalone. Se activa por variable para no forzarlo en
  // desarrollo, donde se usa `next dev` normal.
  ...(process.env.BUILD_STANDALONE ? { output: "standalone" as const } : {}),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.ggpht.com',
      }
    ],
  },
};

export default nextConfig;
