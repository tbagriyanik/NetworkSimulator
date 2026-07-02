import { describe, it, expect } from 'vitest';
import { sanitizeInput, sanitizeObject } from '@/lib/security/sanitizer';

describe('sanitizeInput', () => {
  it('should remove javascript: schemes', () => {
    expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    expect(sanitizeInput('JAVASCRIPT:alert(1)')).toBe('alert(1)');
  });

  it('should remove data: schemes', () => {
    expect(sanitizeInput('data:text/html')).toBe('text/html');
  });

  it('should remove vbscript: schemes', () => {
    expect(sanitizeInput('vbscript:msgbox("Hi")')).toBe('msgbox("Hi")');
  });

  it('should remove file: schemes', () => {
    expect(sanitizeInput('file:///etc/passwd')).toBe('///etc/passwd');
  });

  it('should handle nested/recursive schemes', () => {
    expect(sanitizeInput('javascript:data:alert(1)')).toBe('alert(1)');
    expect(sanitizeInput('java<javascript:>script:alert(1)')).toBe('alert(1)');
  });

  it('should strip HTML tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('alert(1)');
    expect(sanitizeInput('<div>Hello</div>')).toBe('Hello');
  });

  it('should preserve safe text', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
    expect(sanitizeInput('192.168.1.1')).toBe('192.168.1.1');
  });
});

describe('sanitizeObject', () => {
  it('should sanitize strings in an object', () => {
    const input = {
      name: '<script>alert(1)</script>John',
      bio: 'javascript:alert(2)',
    };
    const expected = {
      name: 'alert(1)John',
      bio: 'alert(2)',
    };
    expect(sanitizeObject(input)).toEqual(expected);
  });

  it('should sanitize nested objects and arrays', () => {
    const input = {
      user: {
        name: '<b>Admin</b>',
        roles: ['<script>evil</script>', 'user'],
      },
      metadata: [
        { key: 'title', value: 'javascript:void(0)' }
      ]
    };
    const expected = {
      user: {
        name: 'Admin',
        roles: ['evil', 'user'],
      },
      metadata: [
        { key: 'title', value: 'void(0)' }
      ]
    };
    expect(sanitizeObject(input)).toEqual(expected);
  });

  it('should preserve non-string types', () => {
    const input = {
      id: 123,
      active: true,
      score: 95.5,
      nullValue: null,
    };
    expect(sanitizeObject(input)).toEqual(input);
  });

  it('should skip dangerous keys to prevent prototype pollution', () => {
    const input = JSON.parse('{"name": "John", "__proto__": {"admin": true}, "constructor": {"prototype": {"foo": "bar"}}}');
    const result = sanitizeObject(input) as Record<string, unknown>;

    expect(result.name).toBe('John');
    // Accessing __proto__ or constructor via dot/bracket notation on a plain object
    // may return the inherited prototype/constructor even if not present as an own property.
    // We must check hasOwnProperty to verify the keys were actually skipped during sanitization.
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(false);
  });

  it('should handle non-plain objects like Date or RegExp by returning them as is', () => {
    const date = new Date();
    const regex = /test/;
    expect(sanitizeObject(date)).toBe(date);
    expect(sanitizeObject(regex)).toBe(regex);
  });
});
