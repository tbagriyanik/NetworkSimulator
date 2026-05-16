/**
 * SVG Inlining Utility
 * 
 * Provides utilities to inline SVG icons and avoid additional HTTP requests.
 * 
 * Features:
 * - Inline SVG content directly in HTML
 * - Cache inlined SVGs for performance
 * - Support for SVG attributes and styling
 * - Accessibility support (aria-label, role)
 * 
 * Validates: Requirements 6.6
 */

import { logger } from '@/lib/logger';
import { sanitizeSVG } from '@/lib/security/svgSanitizer';
import { validateURL } from '@/lib/security/sanitizer';

const SVG_FETCH_TIMEOUT_MS = 5000;

const ALLOWED_SVG_HOSTS = new Set<string>([
  // Same-origin is always allowed (checked dynamically)
]);

const svgCache = new Map<string, string>();

/** Fetches and caches SVG content from a URL.
 * 
 * @param url - URL to the SVG file
 * @returns Promise resolving to SVG content string
 */
function isAllowedSVGUrl(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.origin);

        // Relative URLs (no host) are always allowed
        if (!parsed.host || parsed.host === window.location.host) {
            return true;
        }

        // Check against allowed external hosts
        return ALLOWED_SVG_HOSTS.has(parsed.host);
    } catch {
        return false;
    }
}

export async function fetchSVG(url: string): Promise<string> {
    // Allow relative URLs (same-origin), validate absolute ones
    if (!url.startsWith('/')) {
        if (!validateURL(url)) {
            throw new Error(`Invalid or disallowed URL: ${url}`);
        }

        // Restrict to allowed origins for absolute URLs
        if (!isAllowedSVGUrl(url)) {
            throw new Error(`SVG fetch from disallowed host: ${url}`);
        }
    }

    // Check cache first
    if (svgCache.has(url)) {
        return svgCache.get(url)!;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SVG_FETCH_TIMEOUT_MS);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }

        // Validate Content-Type
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('image/svg+xml') && !contentType.includes('text/plain') && !contentType.includes('application/xml')) {
            logger.warn(`Unexpected Content-Type for SVG fetch from ${url}: ${contentType}`);
        }

        let content = await response.text();

        // Sanitize SVG content before caching
        content = sanitizeSVG(content);

        // Cache the content
        svgCache.set(url, content);

        return content;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            logger.error(`SVG fetch timed out for ${url}`);
            throw new Error(`SVG fetch timed out for ${url}`);
        }
        logger.error(`Error fetching SVG from ${url}:`, error);
        throw error;
    }
}

/**
 * Clears the SVG cache.
 * Useful for testing or when SVGs are updated.
 */
export function clearSVGCache(): void {
    svgCache.clear();
}

/**
 * Gets the size of the SVG cache.
 * 
 * @returns Number of cached SVGs
 */
export function getSVGCacheSize(): number {
    return svgCache.size;
}

/**
 * Inlines an SVG by embedding its content directly in HTML.
 * This avoids additional HTTP requests for SVG assets.
 * 
 * @param svgContent - SVG content string
 * @param attributes - Optional HTML attributes to add to SVG element
 * @returns HTML string with inlined SVG
 */
export function inlineSVG(
    svgContent: string,
    attributes?: Record<string, string>
): string {
    // Sanitize SVG content to prevent XSS
    const sanitized = sanitizeSVG(svgContent);
    let inlinedSVG = sanitized;

    if (attributes && Object.keys(attributes).length > 0) {
        // Add attributes to the SVG element
        const attributeString = Object.entries(attributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');

        // Insert attributes after <svg tag (handle both <svg and <svg>)
        inlinedSVG = inlinedSVG.replace(
            /<svg(\s|>)/,
            `<svg ${attributeString}$1`
        );
    }

    return inlinedSVG;
}

/**
 * Optimizes SVG content by removing unnecessary attributes and whitespace.
 * 
 * @param svgContent - SVG content string
 * @returns Optimized SVG content
 */
export function optimizeSVG(svgContent: string): string {
    let optimized = svgContent;

    // Remove XML declaration
    optimized = optimized.replace(/<\?xml[^?]*\?>/g, '');

    // Remove DOCTYPE
    optimized = optimized.replace(/<!DOCTYPE[^>]*>/g, '');

    // Remove comments
    optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');

    // Remove unnecessary whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // Remove empty attributes
    optimized = optimized.replace(/\s+\w+=""/g, '');

    return optimized;
}

/**
 * Creates an inline SVG element with proper attributes.
 * 
 * @param svgContent - SVG content string
 * @param className - CSS class name
 * @param ariaLabel - Accessibility label
 * @returns SVG element string
 */
export function createInlineSVGElement(
    svgContent: string,
    className?: string,
    ariaLabel?: string
): string {
    const attributes: Record<string, string> = {};

    if (className) {
        attributes.class = className;
    }

    if (ariaLabel) {
        attributes['aria-label'] = ariaLabel;
        attributes.role = 'img';
    }

    return inlineSVG(svgContent, attributes);
}

/**
 * Batch inlines multiple SVGs.
 * 
 * @param svgs - Array of SVG URLs or content
 * @returns Promise resolving to array of inlined SVG strings
 */
export async function batchInlineSVGs(
    svgs: Array<{ url?: string; content?: string; attributes?: Record<string, string> }>
): Promise<string[]> {
    const results: string[] = [];

    for (const svg of svgs) {
        try {
            let content = svg.content;

            if (!content && svg.url) {
                content = await fetchSVG(svg.url);
            }

            if (content) {
                const inlined = inlineSVG(content, svg.attributes);
                results.push(inlined);
            }
        } catch (error) {
            logger.error('Error inlining SVG:', error);
            results.push(''); // Add empty string on error
        }
    }

    return results;
}

/**
 * Preloads SVGs for faster inlining.
 * Fetches and caches SVG content in advance.
 * 
 * @param urls - Array of SVG URLs to preload
 * @returns Promise that resolves when all SVGs are preloaded
 */
export async function preloadSVGs(urls: string[]): Promise<void> {
    await Promise.all(
        urls.map(url =>
            fetchSVG(url).catch(error => {
                logger.warn(`Failed to preload SVG: ${url}`, error);
            })
        )
    );
}

/**
 * Gets statistics about SVG inlining performance.
 * 
 * @returns Object with cache statistics
 */
export function getSVGStats(): {
    cacheSize: number;
    cachedUrls: string[];
} {
    return {
        cacheSize: svgCache.size,
        cachedUrls: Array.from(svgCache.keys()),
    };
}
