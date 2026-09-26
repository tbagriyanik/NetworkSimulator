import { describe, it, expect } from 'vitest';
import { executePythonScript } from '../../../components/network/pc-panel/pcPythonRunner';
import { isPyTuple } from '../../../components/network/pc-panel/pcPythonTags';

/**
 * The interpreter distinguishes Python tuples from lists by tagging the backing
 * array with `__isTuple__`. Every tag site used to do this through an inline
 * `as unknown as` assertion; they now go through `markPyTuple()` from
 * pcPythonTags. These tests pin the observable behaviour of that tag so the
 * writer/reader split cannot silently break: if a tag stopped being written or
 * stopped being read, the interpreter would print a tuple as a list.
 */

function run(script: string): string {
    const res = executePythonScript(script);
    expect(res.error).toBeUndefined();
    return res.output;
}

describe('python tuple tagging', () => {
    it('reports tuple type and tuple repr for a parenthesised literal', () => {
        const out = run('t = (1, 2)\nprint(type(t))\nprint(t)');
        expect(out).toContain("<class 'tuple'>");
        expect(out).toContain('(1, 2)');
    });

    it('reports tuple repr with a trailing comma for a one-element literal', () => {
        const out = run('t = (1,)\nprint(type(t))\nprint(t)');
        expect(out).toContain("<class 'tuple'>");
        expect(out).toContain('(1,)');
    });

    it('still reports a plain list literal as list', () => {
        const out = run('l = [1, 2]\nprint(type(l))\nprint(l)');
        expect(out).toContain("<class 'list'>");
        expect(out).toContain('[1, 2]');
    });

    it('tags a multi-value return statement as a tuple', () => {
        const out = run('def f():\n    return 1, 2\nprint(type(f()))\nprint(f())');
        expect(out).toContain("<class 'tuple'>");
        expect(out).toContain('(1, 2)');
    });

    it('propagates the tuple tag through enumerate pairs', () => {
        const out = run('for p in enumerate([7]):\n    print(type(p))\n    print(p)');
        expect(out).toContain("<class 'tuple'>");
        expect(out).toContain('(0, 7)');
    });

    it('propagates the tuple tag through zip rows', () => {
        const out = run('for row in zip([1, 2], [3, 4]):\n    print(type(row))\n    print(row)');
        expect(out).toContain("<class 'tuple'>");
        expect(out).toContain('(1, 3)');
    });

    it('keeps the tuple tag when a tuple is repeated by multiplication', () => {
        const out = run('t = (1, 2) * 2\nprint(type(t))\nprint(t)');
        expect(out).toContain("<class 'tuple'>");
        expect(out).toContain('(1, 2, 1, 2)');
    });

    it('does not tag the result of list repetition', () => {
        const out = run('r = [5] * 2\nprint(type(r))\nprint(r)');
        expect(out).toContain("<class 'list'>");
        expect(out).toContain('[5, 5]');
    });

    it('unpacks a bare comma expression into print arguments', () => {
        // print() receives the tuple as *args, so it must render as "1 2"
        // rather than "(1, 2)". This is the Python-correct output and also a
        // check that the tagged tuple survives argument unpacking.
        const out = run('print(1, 2)');
        expect(out).toContain('1 2');
    });

    it('isPyTuple rejects untagged arrays and non-arrays', () => {
        expect(isPyTuple([1, 2])).toBe(false);
        expect(isPyTuple('tuple')).toBe(false);
        expect(isPyTuple(null)).toBe(false);
        expect(isPyTuple(undefined)).toBe(false);
    });
});
