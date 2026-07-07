/** @type {import('next').NextConfig} */
const bp = process.env.BASE_PATH || ''

const nextConfig = {
  basePath: bp,
  async redirects() {
    // When basePath is set, NextAuth may redirect to /api/auth/error
    // without the basePath prefix. Catch it and add the prefix.
    if (!bp) return []
    return [
      {
        source: '/api/auth/error',
        destination: `${bp}/api/auth/error`,
        permanent: false,
        basePath: false,
      },
    ]
  },
}

module.exports = nextConfig
