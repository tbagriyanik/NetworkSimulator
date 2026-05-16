import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeHTTPContent, validateURL, validateSubnetMask, safeJSONForHTML, sanitizeObject, nonSecurityHash, sha256 } from './sanitizer';
import { sanitizeSVG } from './svgSanitizer';

describe('Security Utils - sanitizer.ts', () => {
    describe('sanitizeInput', () => {
        it('should remove "javascript:" protocol', () => {
            expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
        });

        it('should remove "javascript:" protocol case-insensitively', () => {
            expect(sanitizeInput('JaVaScRiPt:alert(1)')).toBe('alert(1)');
        });

        it('should recursively remove "javascript:" to prevent bypasses', () => {
            // "javas<javascript:>cript:alert(1)" -> the replacement of inner <javascript:>
            // should not leave behind "javascript:alert(1)"
            // Note: sanitizeInput already removes < and > characters
            expect(sanitizeInput('javas<javascript:>cript:alert(1)')).toBe('alert(1)');
            expect(sanitizeInput('javjavascript:ascript:alert(1)')).toBe('alert(1)');
        });

        it('should remove multiple "javascript:" occurrences', () => {
            expect(sanitizeInput('javascript:alert(1); javascript:alert(2)')).toBe('alert(1); alert(2)');
        });

        it('should remove tags and trim', () => {
            expect(sanitizeInput('  <script>alert(1)</script>  ')).toBe('scriptalert(1)/script');
        });
    });

    describe('validateURL', () => {
        it('should allow valid http and https URLs', () => {
            expect(validateURL('http://example.com')).toBe(true);
            expect(validateURL('https://example.com/path?query=1')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(validateURL('not-a-url')).toBe(false);
            expect(validateURL('')).toBe(false);
        });

        it('should reject dangerous protocols', () => {
            expect(validateURL('javascript:alert(1)')).toBe(false);
            expect(validateURL('data:text/html,<html>')).toBe(false);
            expect(validateURL('file:///etc/passwd')).toBe(false);
            expect(validateURL('ftp://example.com')).toBe(false);
        });
    });

    describe('safeJSONForHTML', () => {
        it('should escape dangerous characters to unicode equivalents', () => {
            const data = {
                script: '<script>alert(1)</script>',
                entities: '&quot; onclick="alert(1)"',
                quote: "it's safe"
            };
            const result = safeJSONForHTML(data);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).not.toContain('&');
            expect(result).not.toContain("'");
            expect(result).toContain('\\u003c');
            expect(result).toContain('\\u003e');
            expect(result).toContain('\\u0026');
            expect(result).toContain('\\u0027');
        });
    });

    describe('sanitizeObject', () => {
        it('should protect against prototype pollution', () => {
            const maliciousPayload = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}}');
            const result = sanitizeObject(maliciousPayload);

            // Dangerous keys should be removed from the own properties
            expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
            expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
            expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);

            // The global object should NOT be polluted
            expect(({} as any).polluted).not.toBe(true);
        });

        it('should recursively sanitize objects and arrays', () => {
            const data = {
                id: '<script>1</script>',
                nested: {
                    name: 'javas<javascript:>cript:alert(1)',
                    // Testing that dangerous KEYS are removed, while normal values are sanitized
                    items: ['<b>tag</b>', { '__proto__': 'blocked', 'valid': '<b>safe</b>' }]
                }
            };
            const result = sanitizeObject(data);
            expect(result.id).toBe('script1/script');
            expect(result.nested.name).toBe('alert(1)');
            expect(result.nested.items[0]).toBe('btag/b');

            const nestedObj = result.nested.items[1] as any;
            expect(Object.prototype.hasOwnProperty.call(nestedObj, '__proto__')).toBe(false);
            expect(nestedObj.valid).toBe('bsafe/b');
        });

        it('should preserve Array and Object structures correctly', () => {
            const data = {
                arr: ['a', 'b'],
                obj: { x: 1 }
            };
            const result = sanitizeObject(data);

            expect(Array.isArray(result.arr)).toBe(true);
            expect(result.arr).toHaveLength(2);
            expect(typeof result.obj).toBe('object');
            expect(Array.isArray(result.obj)).toBe(false);
            expect(result.obj.x).toBe(1);
        });
    });

    describe('sanitizeHTTPContent', () => {
        it('should allow <b>, <i>, <u> tags', () => {
            const result = sanitizeHTTPContent('<b>bold</b> <i>italic</i> <u>underline</u>');
            expect(result).toContain('<b>bold</b>');
            expect(result).toContain('<i>italic</i>');
            expect(result).toContain('<u>underline</u>');
        });

        it('should strip dangerous tags like <script>', () => {
            const result = sanitizeHTTPContent('<script>alert(1)</script>');
            expect(result).not.toContain('<script>');
        });

        it('should remove event handler attributes', () => {
            const result = sanitizeHTTPContent('<b onclick="alert(1)">text</b>');
            expect(result).not.toContain('onclick');
        });

        it('should return empty string for empty input', () => {
            expect(sanitizeHTTPContent('')).toBe('');
        });
    });

    describe('sanitizeSVG', () => {
        it('should remove script tags', () => {
            const result = sanitizeSVG('<svg><script>alert(1)</script><path d="M0 0"/></svg>');
            expect(result).not.toContain('<script>');
        });

        it('should remove onload event handlers', () => {
            const result = sanitizeSVG('<svg onload="alert(1)"><path d="M0 0"/></svg>');
            expect(result).not.toContain('onload');
        });

        it('should strip foreignObject tags', () => {
            const result = sanitizeSVG('<svg><foreignObject><div>text</div></foreignObject><path d="M0 0"/></svg>');
            expect(result.toLowerCase()).not.toContain('foreignobject');
        });

        it('should preserve valid SVG structure', () => {
            const result = sanitizeSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="red"/></svg>');
            expect(result).toContain('viewBox');
            expect(result).toContain('path');
            expect(result).toContain('fill="red"');
        });

        it('should return empty string for empty input', () => {
            expect(sanitizeSVG('')).toBe('');
        });
    });

    describe('validateSubnetMask', () => {
        it('should accept valid subnet masks', () => {
            expect(validateSubnetMask('255.255.255.0')).toBe(true);
            expect(validateSubnetMask('255.0.0.0')).toBe(true);
            expect(validateSubnetMask('255.255.0.0')).toBe(true);
            expect(validateSubnetMask('255.255.255.252')).toBe(true);
        });

        it('should reject invalid subnet masks', () => {
            expect(validateSubnetMask('0.0.0.1')).toBe(false);
            expect(validateSubnetMask('0.255.255.0')).toBe(false);
            expect(validateSubnetMask('255.255.255.1')).toBe(false);
            expect(validateSubnetMask('not-an-ip')).toBe(false);
            expect(validateSubnetMask('')).toBe(false);
        });
    });

    describe('nonSecurityHash', () => {
        it('should produce deterministic output', () => {
            expect(nonSecurityHash('hello')).toBe(nonSecurityHash('hello'));
        });

        it('should produce different output for different inputs', () => {
            expect(nonSecurityHash('hello')).not.toBe(nonSecurityHash('world'));
        });

        it('should return a hex string', () => {
            expect(nonSecurityHash('test')).toMatch(/^[0-9a-f]+$/);
        });
    });

    describe('sha256', () => {
        it('should produce deterministic output', async () => {
            const a = await sha256('hello');
            const b = await sha256('hello');
            expect(a).toBe(b);
        });

        it('should produce a 64-character hex string', async () => {
            const result = await sha256('test');
            expect(result).toMatch(/^[0-9a-f]{64}$/);
        });
    });
});
