/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vibes/shared'],
  experimental: {
    typedRoutes: false,
  },
};

module.exports = nextConfig;
