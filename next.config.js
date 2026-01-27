/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable gzip/brotli compression for all responses
  compress: true,

  // Remove X-Powered-By header (minor security + fewer bytes)
  poweredByHeader: false,

  // Enable React strict mode for catching issues early
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
}

module.exports = nextConfig