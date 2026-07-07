/** @type {import('next').NextConfig} */
const bp = process.env.BASE_PATH || ''

const nextConfig = {
  basePath: bp,
  env: { BASE_PATH: bp },
}

// Manually add redirects using the exported function pattern
if (bp) {
  nextConfig.redirects = async () => [
    {
      source: '/api/auth/error',
      destination: `${bp}/api/auth/error`,
      permanent: false,
      basePath: false,
    },
  ]
}

module.exports = nextConfig
