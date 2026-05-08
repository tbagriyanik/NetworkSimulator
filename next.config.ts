import type { NextConfig } from "next";
import { execSync } from "child_process";

let commitCount = '0';
try {
  commitCount = execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
} catch {
  // Not a git repo or git not available - use default
}

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_GIT_COMMIT_COUNT: commitCount < '800' ? '860' : commitCount,
  },
};

export default nextConfig;
