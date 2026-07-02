import { logger } from '@/lib/logger';

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

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validateIPAddress(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const parts = ip.split('.');
    return parts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
}

export function validateSubnetMask(subnet: string): boolean {
    if (!validateIPAddress(subnet)) return false;

    const num = subnet.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

    // All zeros or all ones are not valid subnet masks
    if (num === 0 || num === 0xFFFFFFFF) return false;

    // A valid subnet mask has contiguous 1s followed by contiguous 0s.
    // In the bitwise inversion, adding 1 yields exactly one bit set.
    const inverted = (~num) >>> 0;
    return (inverted & (inverted + 1)) === 0;
}

export function validateMACAddress(mac: string): boolean {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}\.){2}([0-9A-Fa-f]{4})$/;
    return macRegex.test(mac);
}

/**
 * Validates if a string is a valid URL and uses safe protocols (http/https).
 * Explicitly rejects dangerous protocols like javascript:
 */
export function validateURL(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

export function escapeJSON(obj: unknown): string {
    return JSON.stringify(sanitizeObject(obj))
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
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

export function safeParseJSON<T>(value: string, fallback: T): T {
    try {
        return sanitizeObject(JSON.parse(value));
    } catch {
        return fallback;
    }
}

export function validateConfigData(config: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Check for required fields
    if (!config.name || typeof config.name !== 'string') {
        errors.push('Name is required and must be a string');
    }

    // Validate IP if present
    if (config.ip && !validateIPAddress(config.ip as string)) {
        errors.push('Invalid IP address format');
    }

    // Validate subnet if present
    if (config.subnet && !validateSubnetMask(config.subnet as string)) {
        errors.push('Invalid subnet mask format');
    }

    // Validate gateway if present
    if (config.gateway && !validateIPAddress(config.gateway as string)) {
        errors.push('Invalid gateway IP address format');
    }

    // Validate DNS if present
    if (config.dns && !validateIPAddress(config.dns as string)) {
        errors.push('Invalid DNS IP address format');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export function secureLocalStorage() {
    return {
        setItem: (key: string, value: unknown) => {
            try {
                const sanitizedKey = sanitizeInput(key);
                const serialized = JSON.stringify(value);
                localStorage.setItem(sanitizedKey, serialized);
            } catch (e) {
                logger.error('Failed to set item in localStorage:', e);
            }
        },

        getItem: (key: string) => {
            try {
                const sanitizedKey = sanitizeInput(key);
                const item = localStorage.getItem(sanitizedKey);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                logger.error('Failed to get item from localStorage:', e);
                return null;
            }
        },

        removeItem: (key: string) => {
            try {
                const sanitizedKey = sanitizeInput(key);
                localStorage.removeItem(sanitizedKey);
            } catch (e) {
                logger.error('Failed to remove item from localStorage:', e);
            }
        },

        clear: () => {
            try {
                localStorage.clear();
            } catch (e) {
                logger.error('Failed to clear localStorage:', e);
            }
        },
    };
}

/**
 * Non-cryptographic string hash (djb2 variant).
 * Fast, deterministic, but NOT suitable for security purposes (not collision-resistant).
 * Use sha256() when cryptographic hashing is needed.
 */
export function nonSecurityHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

/**
 * Cryptographically secure SHA-256 hash using Web Crypto API.
 * Suitable for security-sensitive operations.
 */
export async function sha256(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        token += chars[array[i] % chars.length];
    }
    return token;
}
