import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSVG, inlineSVG, clearSVGCache, getSVGCacheSize, optimizeSVG, createInlineSVGElement } from './svgInliner';

const VALID_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
const SVG_WITH_SCRIPT = '<svg><script>alert(1)</script><path d="M0 0"/></svg>';
const SVG_WITH_ONLOAD = '<svg onload="alert(1)"><path d="M0 0"/></svg>';
const SVG_WITH_FOREIGN_OBJECT = '<svg><foreignObject><div>text</div></foreignObject><path d="M0 0"/></svg>';
const SVG_WITH_ON_ATTR = '<svg><path d="M0 0" onclick="alert(1)"/></svg>';

beforeEach(() => {
    clearSVGCache();
    vi.restoreAllMocks();
});

describe('fetchSVG', () => {
    it('should reject invalid URLs', async () => {
        await expect(fetchSVG('javascript:alert(1)')).rejects.toThrow();
        await expect(fetchSVG('data:text/html,<svg></svg>')).rejects.toThrow();
        await expect(fetchSVG('ftp://evil.com/test.svg')).rejects.toThrow();
    });

    it('should reject malformed URLs', async () => {
        await expect(fetchSVG('https://')).rejects.toThrow();
    });

    it('should sanitize fetched SVG content', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            headers: new Headers({ 'content-type': 'image/svg+xml' }),
            text: () => Promise.resolve(SVG_WITH_SCRIPT),
        } as any);

        const result = await fetchSVG('/test-sanitize.svg');
        expect(result).not.toContain('<script>');
    });

    it('should cache fetched SVGs', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            headers: new Headers({ 'content-type': 'image/svg+xml' }),
            text: () => Promise.resolve(VALID_SVG),
        } as any);

        const first = await fetchSVG('/test-cached.svg');
        fetchSpy.mockClear();

        const second = await fetchSVG('/test-cached.svg');
        expect(second).toBe(first);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

describe('inlineSVG', () => {
    it('should sanitize script tags from SVG', () => {
        const result = inlineSVG(SVG_WITH_SCRIPT);
        expect(result).not.toContain('<script>');
    });

    it('should remove onload event handlers', () => {
        const result = inlineSVG(SVG_WITH_ONLOAD);
        expect(result).not.toContain('onload');
    });

    it('should strip foreignObject', () => {
        const result = inlineSVG(SVG_WITH_FOREIGN_OBJECT);
        expect(result.toLowerCase()).not.toContain('foreignobject');
    });

    it('should remove onclick attributes', () => {
        const result = inlineSVG(SVG_WITH_ON_ATTR);
        expect(result).not.toContain('onclick');
    });

    it('should preserve valid SVG structure', () => {
        const result = inlineSVG(VALID_SVG);
        expect(result).toContain('<path');
    });

    it('should add attributes to SVG element', () => {
        const result = inlineSVG(VALID_SVG, { class: 'my-icon', 'aria-label': 'test' });
        expect(result).toContain('class="my-icon"');
        expect(result).toContain('aria-label="test"');
    });

    it('should handle empty content', () => {
        expect(inlineSVG('')).toBe('');
    });
});

describe('optimizeSVG', () => {
    it('should remove XML declarations', () => {
        expect(optimizeSVG('<?xml version="1.0"?><svg></svg>')).not.toContain('<?xml');
    });

    it('should remove comments', () => {
        expect(optimizeSVG('<svg><!-- comment --><path/></svg>')).not.toContain('<!--');
    });
});

describe('createInlineSVGElement', () => {
    it('should apply className and aria-label', () => {
        const result = createInlineSVGElement(VALID_SVG, 'icon-lg', 'menu');
        expect(result).toContain('class="icon-lg"');
        expect(result).toContain('aria-label="menu"');
        expect(result).toContain('role="img"');
    });
});
