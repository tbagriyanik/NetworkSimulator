import { describe, it, expect } from 'vitest';
import { safeStringify, safeParse } from '@/lib/network/serialization';

describe('Serialization Module', () => {
  it('should stringify and parse a plain object', () => {
    const obj = { a: 1, b: 'hello', c: true };
    const json = safeStringify(obj);
    const result = safeParse<typeof obj>(json);
    expect(result).toEqual(obj);
  });

  it('should serialize and deserialize a Map', () => {
    const map = new Map<string, number>([['a', 1], ['b', 2], ['c', 3]]);
    const json = safeStringify(map);
    const result = safeParse<Map<string, number>>(json);
    expect(result).toBeInstanceOf(Map);
    expect(result.get('a')).toBe(1);
    expect(result.get('b')).toBe(2);
    expect(result.get('c')).toBe(3);
    expect(result.size).toBe(3);
  });

  it('should serialize and deserialize a Set', () => {
    const set = new Set([1, 2, 3]);
    const json = safeStringify(set);
    const result = safeParse<Set<number>>(json);
    expect(result).toBeInstanceOf(Set);
    expect(result.has(1)).toBe(true);
    expect(result.has(2)).toBe(true);
    expect(result.has(3)).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should handle nested Maps and Sets', () => {
    const obj = {
      map: new Map([['key', new Set([1, 2, 3])]]),
    };
    const json = safeStringify(obj);
    const result = safeParse<typeof obj>(json);
    expect(result.map).toBeInstanceOf(Map);
    expect(result.map.get('key')).toBeInstanceOf(Set);
    expect((result.map.get('key') as Set<number>).has(2)).toBe(true);
  });

  it('should preserve types for Map and Set in mixed objects', () => {
    const mixed = {
      map: new Map([['x', 10]]),
      set: new Set(['a', 'b']),
    };
    const json = safeStringify(mixed);
    const result = safeParse<typeof mixed>(json);
    expect(result.map instanceof Map).toBe(true);
    expect(result.set instanceof Set).toBe(true);
  });
});
