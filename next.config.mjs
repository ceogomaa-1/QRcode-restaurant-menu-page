/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Supabase storage images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

export default nextConfig;
