import type { NextConfig } from "next";
import { execSync } from "child_process";

let commitCount = '0';
try {
  commitCount = execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
} catch {
  // Not a git repo or git not available - use default
}
const countInt = parseInt(commitCount, 10) || 0;
const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  devIndicators: false,
  async headers() {

    // CSP is now handled by middleware; no inline CSP here.


    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_GIT_COMMIT_COUNT: String(countInt),
    NEXT_PUBLIC_IS_ROOM_ENABLED: String(!!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)),
    NEXT_PUBLIC_IS_CONTACT_ENABLED: String(!!process.env.GOOGLE_SHEETS_CONTACT_URL),
  },
};

export default nextConfig;
