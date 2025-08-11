/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization since we're handling files directly
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "http://172.16.55.10:4545" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-API-Key" },
        ]
      }
    ]
  }
}

module.exports = nextConfig