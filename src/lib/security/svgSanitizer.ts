import { logger } from '@/lib/logger';

const ALLOWED_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'use', 'mask', 'clipPath',
  'linearGradient', 'radialGradient', 'stop', 'filter',
  'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge',
  'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight',
  'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
  'animate', 'animateTransform', 'animateMotion', 'set',
  'title', 'desc', 'metadata', 'symbol', 'marker',
  'pattern', 'image', 'textPath', 'a', 'style', 'switch',
]);

const ALLOWED_ATTRS = new Set([
  'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'opacity',
  'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'dx', 'dy', 'd',
  'transform', 'rotate', 'scale', 'translate', 'skewX', 'skewY',
  'style', 'class', 'id',
  'points', 'pathLength',
  'offset', 'stop-color', 'stop-opacity',
  'type', 'values', 'keyTimes', 'dur', 'repeatCount',
  'from', 'to', 'begin', 'end', 'attributeName',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'letter-spacing', 'word-spacing',
  'clip-rule', 'fill-rule',
  'rx', 'ry', 'cx', 'cy', 'r',
  'href', 'target', 'rel',
  'preserveAspectRatio', 'xmlns', 'xmlns:xlink',
  'color', 'display', 'visibility', 'overflow',
  'filter', 'mask', 'clip-path',
]);

const DANGEROUS_ATTR_PREFIXES = ['on'];

const DANGEROUS_TAGS = new Set(['script', 'foreignObject', 'object', 'embed', 'iframe']);

function isDangerousTag(tag: string): boolean {
  return DANGEROUS_TAGS.has(tag.toLowerCase());
}

function isAllowedTag(tag: string): boolean {
  return ALLOWED_TAGS.has(tag.toLowerCase());
}

function isDangerousAttr(name: string): boolean {
  const lower = name.toLowerCase();
  for (const prefix of DANGEROUS_ATTR_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  return false;
}

function isAllowedAttr(name: string): boolean {
  return ALLOWED_ATTRS.has(name.toLowerCase()) || ALLOWED_ATTRS.has(name);
}

/**
 * Sanitizes an SVG string to prevent XSS attacks.
 * Strips dangerous tags (<script>, <foreignObject>, <object>, <embed>, <iframe>),
 * removes event handler attributes (on*), and filters all other tags/attributes
 * against a strict whitelist.
 */
export function sanitizeSVG(svg: string): string {
  if (!svg) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');

    if (doc.querySelector('parsererror')) {
      logger.warn('SVG sanitizer: parse error, returning empty string');
      return '';
    }

    const root = doc.documentElement;
    if (!root) return '';

    sanitizeNode(root);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(root);
  } catch (error) {
    logger.error('SVG sanitizer error:', error);
    return '';
  }
}

function sanitizeNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) return;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    if (isDangerousTag(tagName)) {
      el.remove();
      return;
    }

    if (!isAllowedTag(tagName)) {
      el.remove();
      return;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (isDangerousAttr(attr.name)) {
        el.removeAttribute(attr.name);
      } else if (!isAllowedAttr(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
  }

  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;
    sanitizeNode(child);
    child = next;
  }
}
