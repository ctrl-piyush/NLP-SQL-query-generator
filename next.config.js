/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['groq-sdk', 'better-sqlite3', 'bcryptjs']
  }
}

module.exports = nextConfig
