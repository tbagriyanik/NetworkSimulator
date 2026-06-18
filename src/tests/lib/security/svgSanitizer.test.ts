import { describe, it, expect } from 'vitest';
import { sanitizeSVG } from '@/lib/security/svgSanitizer';

describe('sanitizeSVG', () => {
  it('should remove dangerous tags', () => {
    const input = '<svg><script>alert(1)</script><circle r="10" /></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('<script>');
    expect(output).toContain('<circle');
  });

  it('should remove dangerous attributes', () => {
    const input = '<svg><circle onmouseover="alert(1)" r="10" /></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('onmouseover');
  });

  it('should remove non-whitelisted tags', () => {
    const input = '<svg><unknown-tag>Hello</unknown-tag></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('<unknown-tag>');
  });

  it('should remove non-whitelisted attributes', () => {
    const input = '<svg><circle unknown-attr="value" r="10" /></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('unknown-attr');
  });

  it('should remove javascript: in href', () => {
    const input = '<svg><a href="javascript:alert(1)"><circle r="10" /></a></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('href');
  });

  it('should remove data: in href', () => {
    const input = '<svg><a href="data:text/html,<html><body>XSS</body></html>"><circle r="10" /></a></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('data:');
  });

  it('should handle URI schemes with whitespace', () => {
    const input = '<svg><a href=" java script :alert(1)"><circle r="10" /></a></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('href');
  });

  it('should remove dangerous URIs in xlink:href', () => {
    const input = '<svg><image xlink:href="javascript:alert(1)" /></svg>';
    const output = sanitizeSVG(input);
    expect(output).not.toContain('xlink:href');
  });
});
