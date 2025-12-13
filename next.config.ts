import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/audio',
  webpack: (config, { isServer }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /react-native-fs/,
      })
    );
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
