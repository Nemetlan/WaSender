/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', '@whiskeysockets/baileys'],
  },
};

export default nextConfig;
