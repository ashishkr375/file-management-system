/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization since we're handling files directly
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig