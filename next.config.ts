import type { NextConfig } from "next";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Function to recursively count lines of code under src/
function getLinesOfCode(dir: string): number {
  let lines = 0;
  function traverse(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && /\.(js|jsx|ts|tsx|css)$/.test(file)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        lines += content.split("\n").length;
      }
    }
  }
  try {
    traverse(dir);
  } catch {
    // Ignore error
  }
  return lines;
}

// Function to get the app version from package.json
function getAppVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    return pkg.version || "1.9.6";
  } catch {
    return "1.9.6";
  }
}

// Function to fetch the total commits dynamically
async function getCommitCount(): Promise<number> {
  let localCount = 0;
  try {
    const countStr = execSync("git rev-list --count HEAD", { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
    localCount = parseInt(countStr, 10) || 0;
  } catch {
    // Ignore
  }

  // If local count is high, we can return it directly (means we are on localhost with full history)
  if (localCount >= 1000) {
    return localCount;
  }

  // Otherwise, we are likely on Vercel with shallow clone. Let us try to fetch from GitHub API.
  try {
    const res = await fetch("https://api.github.com/repos/tbagriyanik/networksimulator/commits?per_page=1", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const link = res.headers.get("link");
      if (link) {
        const match = link.match(/&page=(\d+)>; rel="last"/);
        if (match) {
          const apiCount = parseInt(match[1], 10);
          if (apiCount > 0) {
            return apiCount;
          }
        }
      }
    }
  } catch {
    // Ignore fetch error
  }

  // Fallback to local count if above 0, else a sensible baseline
  return localCount > 0 ? localCount : 1656;
}

const config = async () => {
  const commitCount = await getCommitCount();
  const loc = getLinesOfCode("src");
  const version = getAppVersion();

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
      NEXT_PUBLIC_GIT_COMMIT_COUNT: String(commitCount),
      NEXT_PUBLIC_LOC: String(loc),
      NEXT_PUBLIC_APP_VERSION: String(version),
      NEXT_PUBLIC_IS_ROOM_ENABLED: String(!!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)),
      NEXT_PUBLIC_IS_CONTACT_ENABLED: String(!!process.env.GOOGLE_SHEETS_CONTACT_URL),
    },
  };

  return nextConfig;
};

export default config;
