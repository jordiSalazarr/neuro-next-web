/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 🚀 Permite compilar aunque haya errores de lint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
