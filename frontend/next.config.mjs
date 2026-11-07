/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.14'],
  async redirects() {
    return [
      {
        source: '/dashboard/kelola-ipl/tagihan/:path*',
        destination: '/dashboard/kelola-ipl/tagihan-warga/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/kelola-ipl/tagihan-saya/:path*',
        destination: '/dashboard/kelola-ipl/tagihan-pengurus/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;