

/**
 * Security utilities for input sanitization and data protection
 */

export function sanitizeHTML(input: string): string {
    if (!input) return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize HTML content allowing only <b>, <i>, and <u> tags for HTTP service content.
 * Replaced DOMPurify with strict unescaping to avoid Vercel 500 errors.
 */
export function sanitizeHTTPContent(input: string): string {
    if (!input) return '';

    let safe = input.replace(/&/g, '&amp;');
    safe = safe.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    safe = safe
        .replace(/&lt;b&gt;/gi, '<b>').replace(/&lt;\/b&gt;/gi, '</b>')
        .replace(/&lt;i&gt;/gi, '<i>').replace(/&lt;\/i&gt;/gi, '</i>')
        .replace(/&lt;u&gt;/gi, '<u>').replace(/&lt;\/u&gt;/gi, '</u>');
        
    return safe.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    // Strip HTML tags and dangerous characters first
    let sanitized = input.replace(/<[^>]*>?/gm, '').replace(/[<>`]/g, '').trim();
    // Remove dangerous URI schemes recursively to prevent bypasses like "javas<javascript:>cript:"
    // where inner tags or schemes are removed first, leaving behind a malicious payload.
    let prev;
    do {
        prev = sanitized;
        sanitized = sanitized.replace(/(javascript|data|vbscript|file):/gi, '');
    } while (sanitized !== prev);
    return sanitized;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively sanitizes an object or array to prevent XSS and Prototype Pollution.
 * Strings are sanitized via sanitizeInput.
 * Objects skip dangerous keys like __proto__, constructor, and prototype.
 * Array/Object structure is preserved.
 */
export function sanitizeObject<T>(value: T): T {
    if (typeof value === 'string') {
        return sanitizeInput(value) as T;
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeObject(item)) as unknown as T;
    }

    if (value !== null && typeof value === 'object') {
        // Return original object if it's not a plain object (e.g. Date, RegExp)
        if (Object.prototype.toString.call(value) !== '[object Object]') {
            return value;
        }

        const result: Record<string, unknown> = {};

        Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
            const sanitizedKey = sanitizeInput(key);
            // Skip keys that could be used for prototype pollution
            if (!DANGEROUS_KEYS.has(sanitizedKey.toLowerCase())) {
                result[sanitizedKey] = sanitizeObject(entry);
            }
        });
        return result as T;
    }

    return value;
}


/**
 * Encodes data as a JSON string safe for embedding in HTML <script> tags or attributes.
 * Prevents XSS by escaping <, >, &, and ' to their unicode equivalents.
 * Unicode escaping ensures characters are interpreted correctly in both HTML and JS contexts.
 */
export function safeJSONForHTML(data: unknown): string {
    return JSON.stringify(data)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/'/g, '\\u0027');
}

/**
 * Generate a cryptographically secure random ID (UUID-compatible format).
 * Safely falls back if crypto or crypto.randomUUID is not available in the environment.
 */
export function generateSecureId(): string {
    if (typeof window !== 'undefined' && window.crypto) {
        if (typeof window.crypto.randomUUID === 'function') {
            try {
                return window.crypto.randomUUID();
            } catch {
                // Fall through to manual generation
            }
        }
        try {
            const arr = new Uint8Array(16);
            window.crypto.getRandomValues(arr);
            // Construct a valid UUID v4 format
            // Set the version digit to 4
            arr[6] = (arr[6] & 0x0f) | 0x40;
            // Set the variant bits (8, 9, a, or b)
            arr[8] = (arr[8] & 0x3f) | 0x80;

            let hex = '';
            for (let i = 0; i < 16; i++) {
                hex += arr[i].toString(16).padStart(2, '0');
            }
            return [
                hex.slice(0, 8),
                hex.slice(8, 12),
                hex.slice(12, 16),
                hex.slice(16, 20),
                hex.slice(20, 32),
            ].join('-');
        } catch {
            // Fall through to timestamp/Math.random
        }
    }

    // Fallback for SSR or completely missing crypto
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

