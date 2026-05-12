import { describe, it, expect } from 'vitest';
import { sanitizeInput, validateURL } from './sanitizer';

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
});
