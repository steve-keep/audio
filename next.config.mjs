import webpack from "webpack";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
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
