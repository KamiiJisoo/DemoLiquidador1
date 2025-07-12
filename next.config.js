/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic oracledb dependencies that are not needed
      config.externals.push({
        '@azure/app-configuration': 'commonjs @azure/app-configuration',
        '@azure/identity': 'commonjs @azure/identity',
        '@azure/keyvault-secrets': 'commonjs @azure/keyvault-secrets',
        'aws-sdk': 'commonjs aws-sdk',
        'oci-sdk': 'commonjs oci-sdk'
      });
    }

    // Ignore optional dependencies that cause module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      path: false,
      os: false,
      stream: false,
      util: false,
      url: false,
      querystring: false,
    };

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['oracledb']
  }
};

module.exports = nextConfig; 