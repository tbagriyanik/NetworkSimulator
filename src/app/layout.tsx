import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppErrorBoundary } from "@/components/ui/AppErrorBoundary";
import { colors } from '@/lib/design-tokens/colors';

const inriaSans = localFont({
  src: [
    {
      path: "../../public/fonts/InriaSans-LatinExt-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/InriaSans-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/InriaSans-LatinExt-LightItalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/InriaSans-LightItalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/InriaSans-LatinExt-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/InriaSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/InriaSans-LatinExt-RegularItalic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/InriaSans-RegularItalic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/InriaSans-LatinExt-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/InriaSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/InriaSans-LatinExt-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/InriaSans-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-inria-sans",
  display: "swap",
  preload: false,
});

const geistMono = localFont({
  src: [
    {
      path: "../../public/fonts/GeistMono-LatinExt-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-LatinExt-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-LatinExt-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-LatinExt-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-LatinExt-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});

const siteUrl = process.env.APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: "Network Simulator",
  description: "Interactive Network NOS switch simulator for learning network configuration. Practice CLI commands, VLAN management, and security settings.",
  keywords: ["Network", "Switch", "Simulator", "NOS", "Network", "CLI", "VLAN", "Learning"],
  authors: [{ name: "Network Simulator" }],
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Network Simulator",
    description: "Practice Network NOS commands in an interactive web-based simulator",
    url: siteUrl,
    siteName: "Network Simulator",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <Script id="graphics-quality-prepaint" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
          (function() {
            // Runs in <head>, before the body (and React) exist, so the very
            // first paint is already in the right mode. On a machine without
            // GPU acceleration that is the difference between a usable first
            // screen and several seconds of blurred, animated, software
            // rasterized painting.
            try {
              var PREF_KEY = 'graphics-quality-preference';
              var PREF_VERSION = 'graphics-quality-preference-version';
              var PREF_VERSION_VALUE = '2';

              var stored = null;
              try {
                var version = localStorage.getItem(PREF_VERSION);
                if (version !== PREF_VERSION_VALUE) localStorage.removeItem(PREF_KEY);
                stored = localStorage.getItem(PREF_KEY);
              } catch (e) {}

              if (stored === 'high' || stored === 'low') {
                window.__NETSIM_GRAPHICS_QUALITY__ = stored;
                if (stored === 'low') document.documentElement.className += ' graphics-low';
                return;
              }

              var cores = navigator.hardwareConcurrency || 4;
              var memory = navigator.deviceMemory;
              var score = cores <= 2 ? 3 : cores <= 4 ? 2 : cores <= 6 ? 1 : 0;
              if (typeof memory === 'number') {
                if (memory <= 4) score += 3;
                else if (memory <= 8) score += 2;
              }

              // A software rasterizer is the strongest single signal here, but
              // creating a WebGL context costs a few ms, so it is only probed
              // when the CPU/memory numbers are already inconclusive.
              if (score < 3) {
                var canvas = document.createElement('canvas');
                var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                var renderer = '';
                if (gl) {
                  renderer = String(gl.getParameter(gl.RENDERER) || '');
                  // In browsers that do not mask the renderer, gl.RENDERER is already sufficient.
                  // Only query UNMASKED_RENDERER_WEBGL if gl.RENDERER returned a generic placeholder and the extension is present.
                  if (!renderer || /webgl|generic/i.test(renderer)) {
                    try {
                      var info = gl.getExtension('WEBGL_debug_renderer_info');
                      if (info) {
                        renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || renderer);
                      }
                    } catch (extErr) {}
                  }
                  var lose = gl.getExtension('WEBGL_lose_context');
                  if (lose) lose.loseContext();
                }
                if (!gl || /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|mesa offscreen/i.test(renderer)) score += 4;
              }

              window.__NETSIM_GRAPHICS_QUALITY__ = score >= 3 ? 'low' : 'high';
              if (score >= 3) document.documentElement.className += ' graphics-low';
            } catch (e) {}
          })();
        `}} />
        <Script id="secure-storage-interceptor" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
          (function() {
            try {
              var IGNORED_KEYS = ['theme', 'next-themes', 'netsim-language', 'ally-supports-cache'];
              var SECRET_KEY = 'netsim_secure_storage_key';
              var PREFIX = 'ENC:';
              
              function xorCipher(text, key) {
                var result = '';
                for (var i = 0; i < text.length; i++) {
                  result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
                }
                return result;
              }
              
              function encode(data) {
                if (typeof data !== 'string' || data.startsWith(PREFIX)) return data;
                try {
                  return PREFIX + btoa(xorCipher(encodeURIComponent(data), SECRET_KEY));
                } catch(e) { return data; }
              }
              
              function decode(data) {
                if (typeof data !== 'string' || !data.startsWith(PREFIX)) return data;
                try {
                  return decodeURIComponent(xorCipher(atob(data.substring(PREFIX.length)), SECRET_KEY));
                } catch(e) { return data; }
              }
              
              var originalSetItem = window.localStorage.setItem;
              var originalGetItem = window.localStorage.getItem;
              
              var MAX_LENGTHS = {
                'room-student-name': 100,
                'lastProjectName': 100,
                'lastProjectDescription': 500,
                'netsim-language': 10,
                'theme': 20,
                'teacher-browser-id': 100,
                'room-student-id': 100
              };

              function sanitize(key, str) {
                if (typeof str !== 'string') return str;
                
                var limit = MAX_LENGTHS[key];
                if (limit && str.length > limit) {
                  str = str.substring(0, limit);
                }
                
                // For known plain-text fields, replace < and > to prevent XSS
                if (limit) {
                  str = str.replace(/</g, '[').replace(/>/g, ']');
                }
                
                return str;
              }
              
              window.localStorage.setItem = function(key, value) {
                try {
                  if (IGNORED_KEYS.includes(key)) {
                    originalSetItem.call(this, key, value);
                  } else {
                    originalSetItem.call(this, key, encode(value));
                  }
                } catch (e) {
                  originalSetItem.call(this, key, value);
                }
              };
              
              window.localStorage.getItem = function(key) {
                try {
                  var value = originalGetItem.call(this, key);
                  if (value === null || value === undefined) return value;
                  
                  var decoded = IGNORED_KEYS.includes(key) ? value : decode(value);
                  return sanitize(key, decoded);
                } catch (e) {
                  return null;
                }
              };
            } catch (e) {
              console.error('Failed to initialize secure storage interceptor', e);
            }
          })();
        `}} />
        <meta name="theme-color" content={colors.topology.bg} />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Network Sim" />
        <link rel="apple-touch-icon" href="/icon192.svg" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${inriaSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
        >
          <span lang="en">Skip to main content</span>
          <span lang="tr" className="hidden">Ana içeriğe atla</span>
        </a>
        <Providers>
          <AppErrorBoundary>
            <div id="main-content" className="w-full h-screen flex flex-col overflow-hidden">
              {children}
            </div>
          </AppErrorBoundary>
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
