import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necesario para el Dockerfile multi-stage: deja en .next/standalone un
  // server.js con solo las dependencias que se usan, en vez de arrastrar todo
  // node_modules a la imagen final. Sin esto el contenedor no arranca.
  output: "standalone",
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
