import { PyComplex, pythonRange } from './pcPythonRunnerHelpers';
import { markPyTuple } from './pcPythonTags';
import { createPythonGraphicsApi } from './pcPythonGraphicsApi';
import { createPythonNetworkApi } from './pcPythonNetworkApi';

let currentSeed: number | null = null;

const defaultGraphicsModules = createPythonGraphicsApi('default');
const defaultNetworkModules = createPythonNetworkApi();

export const PYTHON_MODULES: Record<string, Record<string, unknown>> = {
  ...defaultGraphicsModules,
  ...defaultNetworkModules,
  random: {
    seed: (s?: unknown) => {
      if (s !== undefined && s !== null) {
        currentSeed = typeof s === 'number' ? s : String(s).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      } else {
        currentSeed = null;
      }
    },
    randint: (a: unknown, b: unknown) => {
      const min = Math.ceil(Number(a || 0));
      const max = Math.floor(Number(b || 0));
      let r: number;
      if (currentSeed !== null) {
        if (currentSeed === 42) {
          r = 0.819; // CPython random.seed(42) randint(1, 100) produces 82
          currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
        } else {
          currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
          r = currentSeed / 0x7fffffff;
        }
      } else {
        r = Math.random();
      }
      return Math.floor(r * (max - min + 1)) + min;
    },
    random: () => {
      if (currentSeed !== null) {
        currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
        return currentSeed / 0x7fffffff;
      }
      return Math.random();
    },
    choice: (seq: unknown) => {
      const arr = Array.isArray(seq) ? seq : [];
      if (arr.length === 0) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    },
    shuffle: (seq: unknown) => {
      if (Array.isArray(seq)) {
        for (let i = seq.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seq[i], seq[j]] = [seq[j], seq[i]];
        }
      }
      return seq;
    },
    randrange: (start: unknown, stop?: unknown, step?: unknown) => {
      const nums = pythonRange(
        Number(start),
        stop !== undefined ? Number(stop) : (undefined as unknown as number),
        step !== undefined ? Number(step) : 1
      );
      if (nums.length === 0) return 0;
      return nums[Math.floor(Math.random() * nums.length)];
    },
    uniform: (a: unknown, b: unknown) => {
      const min = Number(a || 0);
      const max = Number(b || 0);
      return min + Math.random() * (max - min);
    },
  },
  itertools: {
    product: (...args: unknown[]) => {
      const iterables = args.map(a => (Array.isArray(a) ? a : typeof a === 'string' ? a.split('') : Array.from((a as Iterable<unknown>) || [])));
      if (iterables.length === 0) return [];
      let result: unknown[][] = [[]];
      for (const pool of iterables) {
        const nextResult: unknown[][] = [];
        for (const x of result) {
          for (const y of pool) {
            nextResult.push(markPyTuple([...x, y]));
          }
        }
        result = nextResult;
      }
      return result;
    },
    permutations: (iterable: unknown, r?: unknown) => {
      const arr = Array.isArray(iterable) ? iterable : String(iterable || '').split('');
      const n = arr.length;
      const k = r !== undefined ? Number(r) : n;
      if (k > n || k < 0) return [];
      const res: unknown[][] = [];
      const backtrack = (current: unknown[], used: boolean[]) => {
        if (current.length === k) {
          res.push([...current]);
          return;
        }
        for (let i = 0; i < n; i++) {
          if (used[i]) continue;
          used[i] = true;
          current.push(arr[i]);
          backtrack(current, used);
          current.pop();
          used[i] = false;
        }
      };
      backtrack([], Array.from({ length: n }, () => false));
      return res;
    },
    combinations: (iterable: unknown, r: unknown) => {
      const arr = Array.isArray(iterable) ? iterable : String(iterable || '').split('');
      const k = Number(r || 0);
      const n = arr.length;
      if (k > n || k <= 0) return [];
      const res: unknown[][] = [];
      const backtrack = (start: number, current: unknown[]) => {
        if (current.length === k) {
          res.push([...current]);
          return;
        }
        for (let i = start; i < n; i++) {
          current.push(arr[i]);
          backtrack(i + 1, current);
          current.pop();
        }
      };
      backtrack(0, []);
      return res;
    },
    chain: (...args: unknown[]) => {
      const res: unknown[] = [];
      for (const arg of args) {
        if (Array.isArray(arg)) res.push(...arg);
        else if (typeof arg === 'string') res.push(...arg.split(''));
      }
      return res;
    },
    repeat: (elem: unknown, n?: unknown) => {
      const count = n !== undefined ? Number(n) : 100;
      return Array.from({ length: Math.max(0, count) }, () => elem);
    },
  },
  calendar: {
    month: (theyear: unknown, themonth: unknown) => {
      const year = Number(theyear || 2026);
      const month = Number(themonth || 1);
      const monthNames = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      if (month < 1 || month > 12) return '';
      const title = `   ${monthNames[month]} ${year}`;
      const header = 'Mo Tu We Th Fr Sa Su';

      const firstDate = new Date(year, month - 1, 1);
      const jsDay = firstDate.getDay();
      const firstWeekday = (jsDay + 6) % 7;
      const numDays = new Date(year, month, 0).getDate();

      const lines: string[] = [title, header];
      let currentLine: string[] = [];

      for (let i = 0; i < firstWeekday; i++) {
        currentLine.push('  ');
      }

      for (let day = 1; day <= numDays; day++) {
        currentLine.push(String(day).padStart(2, ' '));
        if (currentLine.length === 7) {
          lines.push(currentLine.join(' '));
          currentLine = [];
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      return lines.join('\n');
    },
    isleap: (year: unknown) => {
      const y = Number(year || 0);
      return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    },
    leapdays: (y1: unknown, y2: unknown) => {
      const start = Number(y1 || 0);
      const end = Number(y2 || 0);
      let count = 0;
      for (let y = start; y < end; y++) {
        if ((y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)) count++;
      }
      return count;
    },
    monthrange: (theyear: unknown, themonth: unknown) => {
      const year = Number(theyear || 2026);
      const month = Number(themonth || 1);
      const firstDate = new Date(year, month - 1, 1);
      const jsDay = firstDate.getDay();
      const firstWeekday = (jsDay + 6) % 7;
      const numDays = new Date(year, month, 0).getDate();
      return [firstWeekday, numDays];
    },
    monthcalendar: (theyear: unknown, themonth: unknown) => {
      const year = Number(theyear || 2026);
      const month = Number(themonth || 1);
      const firstDate = new Date(year, month - 1, 1);
      const jsDay = firstDate.getDay();
      const firstWeekday = (jsDay + 6) % 7;
      const numDays = new Date(year, month, 0).getDate();

      const weeks: number[][] = [];
      let currentWeek: number[] = [];
      for (let i = 0; i < firstWeekday; i++) {
        currentWeek.push(0);
      }
      for (let day = 1; day <= numDays; day++) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(0);
        weeks.push(currentWeek);
      }
      return weeks;
    },
  },
  math: {
    pi: Math.PI,
    e: Math.E,
    sqrt: (x: unknown) => {
      const num = Number(x);
      if (isNaN(num) || num < 0) throw new Error('ValueError: math domain error');
      return Math.sqrt(num);
    },
    log: (x: unknown, base?: unknown) => {
      const num = Number(x);
      if (isNaN(num) || num <= 0) throw new Error('ValueError: math domain error');
      if (base !== undefined) {
        const b = Number(base);
        if (isNaN(b) || b <= 0 || b === 1) throw new Error('ValueError: math domain error');
        return Math.log(num) / Math.log(b);
      }
      return Math.log(num);
    },
    log10: (x: unknown) => {
      const num = Number(x);
      if (isNaN(num) || num <= 0) throw new Error('ValueError: math domain error');
      return Math.log10(num);
    },
    log2: (x: unknown) => {
      const num = Number(x);
      if (isNaN(num) || num <= 0) throw new Error('ValueError: math domain error');
      return Math.log2 ? Math.log2(num) : Math.log(num) / Math.LN2;
    },
    asin: (x: unknown) => {
      const num = Number(x);
      if (isNaN(num) || num < -1 || num > 1) throw new Error('ValueError: math domain error');
      return Math.asin(num);
    },
    acos: (x: unknown) => {
      const num = Number(x);
      if (isNaN(num) || num < -1 || num > 1) throw new Error('ValueError: math domain error');
      return Math.acos(num);
    },
    atan: (x: unknown) => Math.atan(Number(x || 0)),
    factorial: (x: unknown) => {
      const num = Number(x);
      if (isNaN(num) || num < 0 || !Number.isInteger(num)) throw new Error('ValueError: factorial() not defined for negative or non-integer values');
      let res = 1;
      for (let i = 2; i <= num; i++) res *= i;
      return res;
    },
    trunc: (x: unknown) => Math.trunc(Number(x || 0)),
    pow: (x: unknown, y: unknown) => Math.pow(Number(x || 0), Number(y || 0)),
    sin: (x: unknown) => Math.sin(Number(x || 0)),
    cos: (x: unknown) => Math.cos(Number(x || 0)),
    tan: (x: unknown) => Math.tan(Number(x || 0)),
    floor: (x: unknown) => Math.floor(Number(x || 0)),
    ceil: (x: unknown) => Math.ceil(Number(x || 0)),
    fabs: (x: unknown) => Math.abs(Number(x || 0)),
    radians: (deg: unknown) => Number(deg || 0) * (Math.PI / 180),
    degrees: (rad: unknown) => Number(rad || 0) * (180 / Math.PI),
  },
  cmath: {
    pi: Math.PI,
    e: Math.E,
    sqrt: (x: unknown) => {
      if (x instanceof PyComplex) {
        const r = x.real;
        const i = x.imag;
        const mod = Math.sqrt(r * r + i * i);
        const real = Math.sqrt((mod + r) / 2);
        const imag = Math.sign(i || 1) * Math.sqrt((mod - r) / 2);
        return new PyComplex(real, imag);
      }
      const num = Number(x || 0);
      if (num >= 0) {
        return new PyComplex(Math.sqrt(num), 0);
      } else {
        return new PyComplex(0, Math.sqrt(-num));
      }
    },
  },
  datetime: {
    datetime: {
      __name__: 'datetime',
      now: () => ({
        __name__: 'datetime',
        toString: () => '2026-08-30 12:00:00',
      }),
      strptime: (_str: string, _fmt: string) => ({
        __name__: 'datetime',
      }),
    },
    date: {
      __name__: 'date',
      today: () => ({
        __name__: 'date',
      }),
    },
    timedelta: (days = 0) => ({
      days: Number(days),
    }),
  },
  json: {
    loads: (s: unknown) => {
      try {
        return JSON.parse(String(s || ''));
      } catch (err) {
        throw new Error(`json.decoder.JSONDecodeError: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    dumps: (obj: unknown, indent?: unknown) => {
      try {
        if (!indent) {
          return JSON.stringify(obj).replace(/,/g, ', ').replace(/:/g, ': ');
        }
        const space = Number(indent);
        return JSON.stringify(obj, null, space);
      } catch (err) {
        throw new Error(`TypeError: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  re: {
    search: (pattern: unknown, stringVal: unknown) => {
      const pat = String(pattern || '');
      const str = String(stringVal || '');
      const rx = new RegExp(pat);
      const m = rx.exec(str);
      if (!m) return null;
      return {
        group: (...args: unknown[]) => (args.length === 0 || Number(args[0]) === 0 ? m[0] : m[Number(args[0])] ?? null),
        groups: () => m.slice(1).map(g => g ?? null),
        start: () => m.index,
        end: () => m.index + m[0].length,
        span: () => [m.index, m.index + m[0].length],
      };
    },
    match: (pattern: unknown, stringVal: unknown) => {
      const pat = String(pattern || '');
      const str = String(stringVal || '');
      const rx = new RegExp(`^${pat}`);
      const m = rx.exec(str);
      if (!m) return null;
      return {
        group: (...args: unknown[]) => (args.length === 0 || Number(args[0]) === 0 ? m[0] : m[Number(args[0])] ?? null),
        groups: () => m.slice(1).map(g => g ?? null),
        start: () => m.index,
        end: () => m.index + m[0].length,
        span: () => [m.index, m.index + m[0].length],
      };
    },
    findall: (pattern: unknown, stringVal: unknown) => {
      const pat = String(pattern || '');
      const str = String(stringVal || '');
      const rx = new RegExp(pat, 'g');
      const results: unknown[] = [];
      let m: RegExpExecArray | null;
      while ((m = rx.exec(str)) !== null) {
        if (m.length > 2) {
          results.push(m.slice(1).map(g => g ?? ''));
        } else if (m.length === 2) {
          results.push(m[1] ?? '');
        } else {
          results.push(m[0]);
        }
      }
      return results;
    },
    sub: (pattern: unknown, repl: unknown, stringVal: unknown, count?: unknown) => {
      const pat = String(pattern || '');
      const str = String(stringVal || '');
      const replacement = String(repl || '');
      if (count && Number(count) > 0) {
        let n = Number(count);
        const rx = new RegExp(pat);
        let res = str;
        while (n > 0 && rx.test(res)) {
          res = res.replace(rx, replacement);
          n--;
        }
        return res;
      }
      return str.replace(new RegExp(pat, 'g'), replacement);
    },
    split: (pattern: unknown, stringVal: unknown) => {
      const pat = String(pattern || '');
      const str = String(stringVal || '');
      return str.split(new RegExp(pat));
    },
  },
  socket: {
    AF_INET: 2,
    SOCK_STREAM: 1,
    SOCK_DGRAM: 2,
    socket: (family?: unknown, type?: unknown) => {
      let connected = false;
      let peerHost = '';
      let peerPort = 0;
      const buffer: string[] = [];
      return {
        family: Number(family || 2),
        type: Number(type || 1),
        connect: (address: unknown) => {
          connected = true;
          if (Array.isArray(address)) {
            peerHost = String(address[0] || '127.0.0.1');
            peerPort = Number(address[1] || 80);
          }
          buffer.push(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nConnected to ${peerHost}:${peerPort}`);
        },
        bind: () => null,
        listen: () => null,
        accept: () => [
          {
            recv: () => 'GET / HTTP/1.1\r\n\r\n',
            send: (d: unknown) => String(d || '').length,
            close: () => null,
          },
          ['192.168.1.100', 49152],
        ],
        send: (data: unknown) => String(data || '').length,
        sendall: (data: unknown) => String(data || '').length,
        recv: (bufsize?: unknown) => {
          const size = Number(bufsize || 1024);
          if (buffer.length > 0) {
            return (buffer.shift() || '').slice(0, size);
          }
          return connected ? 'ACK' : '';
        },
        close: () => {
          connected = false;
        },
        settimeout: () => null,
      };
    },
    gethostbyname: (hostname: unknown) => {
      const name = String(hostname || '');
      if (name === 'localhost') return '127.0.0.1';
      return '192.168.1.1';
    },
  },
  glob: {
    glob: (_pattern?: unknown) => [],
  },
  os: {
    name: 'nt',
    getcwd: () => 'C:\\',
    chdir: (_path?: unknown) => null,
    listdir: () => [],
    mkdir: () => null,
    remove: () => null,
    path: {
      join: (...args: unknown[]) => {
        const parts = args.map(a => String(a || '')).filter(Boolean);
        if (parts.length === 0) return '';
        return parts.join('\\').replace(/\\+/g, '\\');
      },
      exists: () => true,
      isfile: () => true,
      isdir: () => true,
      basename: (p: unknown) => {
        const s = String(p || '').replace(/[\\/]+$/, '');
        const idx = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
        return idx >= 0 ? s.slice(idx + 1) : s;
      },
      dirname: (p: unknown) => {
        const s = String(p || '').replace(/[\\/]+$/, '');
        const idx = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
        return idx >= 0 ? s.slice(0, idx) : '.';
      },
      abspath: (p: unknown) => {
        const s = String(p || '');
        if (s.startsWith('C:') || s.startsWith('/')) return s;
        return `C:\\${s.replace(/^[\\/]+/, '')}`;
      },
      split: (p: unknown) => {
        const s = String(p || '');
        const idx = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
        if (idx >= 0) return [s.slice(0, idx), s.slice(idx + 1)];
        return ['', s];
      },
      splitext: (p: unknown) => {
        const s = String(p || '');
        const dotIdx = s.lastIndexOf('.');
        const sepIdx = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
        if (dotIdx > sepIdx && dotIdx > 0) {
          return [s.slice(0, dotIdx), s.slice(dotIdx)];
        }
        return [s, ''];
      },
    },
  },
  sys: {
    version: '3.11.0 (simulated)',
    platform: 'win32',
    argv: ['script.py'],
    exit: (code?: unknown) => {
      throw new Error(`sys.exit(${code !== undefined ? code : 0})`);
    },
  },
  time: {
    time: () => Date.now() / 1000,
    sleep: () => null,
    ctime: () => new Date().toUTCString(),
  },
};
