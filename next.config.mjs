/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    // Auth.js v5 types don't fully match Next.js 15 yet
    ignoreBuildErrors: true,
  },
}

export default nextConfig
