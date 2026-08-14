/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  async redirects() {
    return [
      { source: '/engagement', destination: '/outreach/queue', permanent: false },
      { source: '/campaigns', destination: '/outreach', permanent: false }
    ];
  }
};

export default nextConfig;
