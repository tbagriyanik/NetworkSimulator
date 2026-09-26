/**
 * Shared tag types for the embedded Python interpreter.
 *
 * The interpreter represents Python-level metadata (tuples, keyword argument
 * names, class methods) by bolting properties onto ordinary JavaScript values,
 * because arrays and functions are just objects at runtime. TypeScript has no
 * way to know about those properties, which is why the interpreter previously
 * needed `value as unknown as { __isTuple__?: boolean }` at every tag site.
 *
 * These aliases give those properties a name in the type system so the
 * assertions are not needed at the read sites. The write sites that create the
 * tags still narrow once, via the setters below.
 */

/** An array the interpreter tagged as a Python tuple. */
export type PyTaggedTuple = unknown[] & { __isTuple__?: boolean };

/** A callable the interpreter tagged with its Python parameter names. */
export type PyKeywordAware = ((...args: unknown[]) => unknown) & {
  __pythonParamNames?: string[];
};

/** True when `value` is an array the interpreter tagged as a tuple. */
export function isPyTuple(value: unknown): value is PyTaggedTuple {
  return Array.isArray(value) && (value as PyTaggedTuple).__isTuple__ === true;
}

/** Tags `arr` as a Python tuple. Returns the same array for chaining. */
export function markPyTuple<T extends unknown[]>(arr: T): T {
  (arr as PyTaggedTuple).__isTuple__ = true;
  return arr;
}

/** Reads the Python parameter names a native callable advertises. */
export function pyParamNames(fn: unknown): string[] | undefined {
  if (typeof fn !== 'function' && (typeof fn !== 'object' || fn === null)) return undefined;
  return (fn as PyKeywordAware).__pythonParamNames;
}

/**
 * Narrows a Python-visible callable to a JavaScript constructor when it looks
 * like one: it must own a prototype whose `constructor` points back at itself
 * and which declares more than just the implicit `constructor` member.
 *
 * The predicate is intentionally identical to the inline check it replaces so
 * that the set of values treated as constructable does not change.
 */
export function asPyConstructor(
  fn: unknown,
): (new (...args: unknown[]) => unknown) | null {
  if (typeof fn !== 'function') return null;
  const ctor = fn as (new (...args: unknown[]) => unknown) & {
    prototype?: { constructor?: unknown };
  };
  if (!ctor.prototype) return null;
  if (ctor.prototype.constructor !== ctor) return null;
  if (Object.getOwnPropertyNames(ctor.prototype).length <= 1) return null;
  return ctor;
}
