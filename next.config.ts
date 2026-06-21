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
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; ");

    const cspReportOnlyProd = process.env.NODE_ENV === "production"
      ? `${cspReportOnly}; require-trusted-types-for 'script'; trusted-types default`
      : cspReportOnly;

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnlyProd },
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
