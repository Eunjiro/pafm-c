import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow geolocation on locator pages - this is needed for navigation
        source: '/dashboard/cemeteries/:id/locator',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self)'
          }
        ]
      },
      {
        // Block geolocation on map pages to prevent unwanted permission prompts
        source: '/dashboard/cemeteries/:id/map',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'geolocation=()'
          }
        ]
      },
      {
        // Default: allow geolocation for all other pages
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self)'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
