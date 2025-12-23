/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Permitir acceso desde otros dispositivos en la red local
  allowedDevOrigins: [
    'http://192.168.1.101:3000',
    'http://192.168.1.*:3000',
  ],
};

module.exports = nextConfig;
