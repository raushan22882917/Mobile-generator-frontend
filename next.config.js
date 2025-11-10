/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker/Cloud Run deployments
  // Comment out for Vercel deployment
  // output: 'standalone',
};

module.exports = nextConfig;
