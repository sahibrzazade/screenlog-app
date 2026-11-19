import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve images as-is: skips Next's optimizer, which spends Vercel's
    // image transformation quota. TMDB already serves pre-sized images.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
