import type { NextConfig } from "next";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const LOC_CACHE_FILE = path.join(process.cwd(), "node_modules", ".cache", "netsim-loc.json");

/**
 * Total lines under `src/`, cached against the newest mtime in the tree.
 *
 * The count only feeds the About dialog badge, but it used to read and split
 * ~1,200 source files on every `next dev` start and every build. Stat-ing the
 * tree is cheap; reading it is not, so the count is only recomputed when a file
 * actually changed.
 */
function getLinesOfCode(dir: string): number {
  let newestMtimeMs = 0;
  let files: string[] = [];

  function collect(currentDir: string) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        collect(fullPath);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx|css)$/.test(entry.name)) {
        files.push(fullPath);
        const mtimeMs = fs.statSync(fullPath).mtimeMs;
        if (mtimeMs > newestMtimeMs) newestMtimeMs = mtimeMs;
      }
    }
  }

  try {
    collect(dir);
  } catch {
    // Ignore error
  }

  try {
    const cached = JSON.parse(fs.readFileSync(LOC_CACHE_FILE, "utf-8"));
    if (cached && cached.newestMtimeMs === newestMtimeMs && typeof cached.lines === "number") {
      return cached.lines;
    }
  } catch {
    // No usable cache — fall through and recompute.
  }

  let lines = 0;
  for (const file of files) {
    try {
      lines += fs.readFileSync(file, "utf-8").split("\n").length;
    } catch {
      // Ignore unreadable file
    }
  }

  try {
    fs.mkdirSync(path.dirname(LOC_CACHE_FILE), { recursive: true });
    fs.writeFileSync(LOC_CACHE_FILE, JSON.stringify({ newestMtimeMs, lines }));
  } catch {
    // Cache is an optimization only.
  }

  return lines;
}

// Function to get the app version from package.json
function getAppVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    return pkg.version || "2.4";
  } catch {
    return "2.4";
  }
}

const FALLBACK_COMMIT_COUNT = 1656;

/** Set for the lifetime of a build/dev run so `next.config.ts` can tell them apart. */
process.env.NEXT_PHASE ??= process.argv.includes('dev') ? 'phase-development-server' : 'phase-production-build';

async function getCommitCount(): Promise<number> {
  // 1. Try querying API first for true commit count (avoids shallow clone depth truncation)
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
    // Ignore fetch error, fallback to local git
  }

  // 2. Query local git rev-list
  let localCount = 0;
  try {
    const countStr = execSync("git rev-list --count HEAD", { stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
    localCount = parseInt(countStr, 10) || 0;
  } catch {
    // Ignore
  }

  // If local count is substantial (not truncated shallow clone), use it; otherwise fallback
  if (localCount > 1000) {
    return localCount;
  }

  return FALLBACK_COMMIT_COUNT;
}

const config = async () => {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-development-server';

  // Both of these only feed the About dialog badges, and in development they
  // cost a GitHub API round-trip plus a walk of the whole `src/` tree on every
  // config reload. Dev builds just reuse the last known values.
  const commitCount = isDev ? FALLBACK_COMMIT_COUNT : await getCommitCount();
  const loc = getLinesOfCode("src");
  const version = getAppVersion();

  const isExport = process.env.NEXT_EXPORT === 'true';

  const nextConfig: NextConfig = {
    agentRules: false,
    ...(isExport ? { output: "export" as const } : {}),
    images: {
      unoptimized: true,
    },
    productionBrowserSourceMaps: false,
    experimental: {
      // `lucide-react` is a barrel of ~1500 icon modules; without this every
      // page that touches one icon ships the whole set. The other two entries
      // are the remaining barrels this app pulls from, so the same tree-shaking
      // applies to them.
      optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "jspdf"],
      // Memory optimization for low-resource builds
      webpackMemoryOptimizations: true,
    },
    typescript: {
      ignoreBuildErrors: false,
    },
    reactStrictMode: true,
    devIndicators: false,
    // Performance optimizations for low-resource desktop builds
    compress: true,

    // Long-lived caching for the immutable build output. Next fingerprints these
    // paths itself, so a `max-age` long enough to survive a deploy cycle removes
    // a conditional request on every asset when the app is reopened.
    //
    // Static exports (`NEXT_EXPORT=true`, used by the desktop builds) serve from
    // disk where response headers come from the webview's own cache, so the
    // rules are only attached to a server-rendered deployment. In development
    // they are skipped too: a custom Cache-Control on `/_next/static` breaks
    // Next's dev-time asset invalidation (and the dev server warns about it).
    ...(!isExport && !isDev ? {
      async headers() {
        const immutableAssetHeaders = [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ];

        const sharedSecurityHeaders = [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ];

        const rules = [
          {
            source: "/fonts/:path*",
            headers: [
              { key: "Access-Control-Allow-Origin", value: "*" },
              { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
              ...immutableAssetHeaders,
            ],
          },
          {
            // Fingerprinted Next.js output (chunks, media, the static build dir).
            source: "/_next/static/:path*",
            headers: immutableAssetHeaders,
          },
          {
            // App icons and the web manifest change rarely and are small enough
            // that a stale copy is never worth a revalidation round-trip.
            source: "/:all(icon*|apple-touch-icon*|favicon*|manifest.json)",
            headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
          },
          {
            source: "/(.*)",
            headers: sharedSecurityHeaders,
          },
        ];

        return rules;
      },
    } : {}),

    // No `webpack` override here on purpose: Next 16 builds with Turbopack, and
    // the old override (which merged every node_modules import into a single
    // `vendor` chunk) only applied to a `next build --webpack` run, where it
    // replaced Next's own chunking rather than tuning it.

    // In development any `headers()` entry whose source is under `/_next/static`
    // makes the dev server print "Custom Cache-Control headers detected" and turn
    // off its own dev-time asset invalidation. The rules above are therefore only
    // attached to real deployments; this applies to `next start` too, because the
    // next.config.ts module itself is also re-evaluated inside that process.
    ...(isDev ? { async headers() { return []; } } : {}),

    env: {
      NEXT_PUBLIC_GIT_COMMIT_COUNT: String(commitCount),
      NEXT_PUBLIC_LOC: String(loc),
      APP_VERSION: String(version),
      NEXT_PUBLIC_IS_DESKTOP: isExport ? 'true' : String(process.env.TAURI_ENV_PLATFORM !== undefined || process.env.NEXT_PUBLIC_IS_DESKTOP === 'true'),
      NEXT_PUBLIC_IS_ROOM_ENABLED: isExport ? 'false' : String(!!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)),
      NEXT_PUBLIC_IS_CONTACT_ENABLED: isExport ? 'false' : String(!!process.env.GOOGLE_SHEETS_CONTACT_URL),
    },
  };

  return nextConfig;
};

export default config;
