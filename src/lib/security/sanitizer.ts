

export function sanitizeHTML(input: string): string {
    if (!input) return '';
    let safe = input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Unescape safe syntax highlight span tags safely (only styling attributes)
    safe = safe
        .replace(/&lt;span style=&quot;([^&"]+)&quot;&gt;/gi, (_, styleStr) => {
            const cleanStyle = styleStr.replace(/[^a-zA-Z0-9#;.:\s%-]/g, '');
            return `<span style="${cleanStyle}">`;
        })
        .replace(/&lt;\/span&gt;/gi, '</span>');

    return safe;
}

export function decodeHTMLEntities(input: string): string {
    if (!input) return '';
    return input
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

function sanitizeAttributes(attrs: string): string {
    if (!attrs || !attrs.trim()) return '';

    const attrRegex = /([a-z0-9:-]+)(?:\s*=\s*(?:(["'])(.*?)\2|([^\s>]+)))?/gi;
    let result = '';
    let match: RegExpExecArray | null;

    while ((match = attrRegex.exec(attrs)) !== null) {
        const key = match[1];
        const val = match[3] ?? match[4] ?? '';

        // Strip event handlers (onload, onerror, onclick, etc.)
        if (/^on/i.test(key)) {
            continue;
        }

        // For URI attributes, inspect scheme for dangerous protocols
        if (/^(?:href|src|action|formaction)$/i.test(key)) {
            // eslint-disable-next-line no-control-regex
            const normalizedVal = val.replace(/[\s\x00-\x1F]/g, '').toLowerCase();
            if (/^(?:javascript|vbscript|data|file):/i.test(normalizedVal)) {
                continue;
            }
        }

        // Sanitize style attribute if present
        let safeVal = val;
        if (/^style$/i.test(key)) {
            safeVal = val.replace(/(?:javascript|expression|url\s*\(\s*["']?\s*javascript)/gi, '');
        }

        result += ` ${key}="${safeVal.replace(/"/g, '&quot;')}"`;
    }

    return result;
}

/**
 * Sanitize HTML content for HTTP service content without external libraries.
 * Allows basic formatting and layout tags while preventing XSS.
 */
export function sanitizeHTTPContent(input: string): string {
    if (!input) return '';

    // Strip out dangerous tags to a fixpoint to prevent evasion via nested tags
    const DANGEROUS_TAGS_RE = /<(script|style|iframe|object|embed|form|input|button|link|meta)[\s\S]*?>[\s\S]*?<\/\1>/gi;
    let prev: string;
    let cleaned = input;
    do {
        prev = cleaned;
        cleaned = cleaned.replace(DANGEROUS_TAGS_RE, '');
    } while (cleaned !== prev);

    // Escape unallowed HTML tags while preserving basic formatting tags
    const allowedTags = /^(?:b|i|u|br|p|span|h1|h2|h3|h4|h5|h6|a|img|\/b|\/i|\/u|\/br|\/p|\/span|\/h1|\/h2|\/h3|\/h4|\/h5|\/h6|\/a|\/img)$/i;

    return cleaned.replace(/<(\/?[a-z0-9]+)([^>]*)>/gi, (match, tag, attrs) => {
        if (!allowedTags.test(tag)) {
            return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        if (tag.startsWith('/')) {
            return `<${tag}>`;
        }
        const cleanAttrs = sanitizeAttributes(attrs);
        return `<${tag}${cleanAttrs}>`;
    });
}

function stripHtmlTags(str: string): string {
    let result = '';
    let insideTag = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '<') {
            insideTag = true;
        } else if (char === '>') {
            insideTag = false;
        } else if (!insideTag) {
            result += char;
        }
    }
    return result;
}

export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    let sanitized = input.trim();

    // Dangerous URI schemes that could enable XSS via href/src attributes.
    // Collapses all inter-character whitespace (including Unicode) so obfuscated
    // schemes like "j a v a s c r i p t :" are caught.
    const DANGEROUS_SCHEMES_RE = /(?:\s)*(?:javascript|vbscript|data|file)(?:\s)*:/gi;

    // Iterate tag stripping and scheme removal to a fixpoint. Repeating until no further
    // changes prevents bypasses where overlapping, nested, or malformed tags
    // (e.g. "<<script>script>", "java<javascript>:...") leave dangerous syntax behind.
    let prev: string;
    do {
        prev = sanitized;
        sanitized = stripHtmlTags(sanitized).replace(DANGEROUS_SCHEMES_RE, '');
    } while (sanitized !== prev);

    // Remove any residual angle brackets, preventing reassembly into markup.
    sanitized = sanitized.replace(/[<>]/g, '').trim();

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

