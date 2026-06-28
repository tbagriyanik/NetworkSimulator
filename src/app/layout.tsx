import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Inria_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppErrorBoundary } from "@/components/ui/AppErrorBoundary";

const inriaSans = Inria_Sans({
  variable: "--font-inria-sans",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yunus.sf.net';

export const metadata: Metadata = {
  title: "Network Simulator",
  description: "Interactive Network NOS switch simulator for learning network configuration. Practice CLI commands, VLAN management, and security settings.",
  keywords: ["Network", "Switch", "Simulator", "NOS", "Network", "CLI", "VLAN", "Learning"],
  authors: [{ name: "Network Simulator Team" }],
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
  twitter: {
    card: "summary_large_image",
    title: "Network Simulator",
    description: "Practice Network NOS commands in an interactive web-based simulator",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* Apply the nonce to a placeholder script so Next’s internal inline scripts inherit it */}
        <Script id="csp-nonce" strategy="beforeInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: '' }} />
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NetSim" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon192.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon192.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon192.svg" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon192.svg" />
      </head>
      <body
        className={`${inriaSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
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
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
