import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'mupdf': 'commonjs mupdf'
      });
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['mupdf']
  }
};

export default nextConfig;
