import { describe, it, expect, beforeEach } from 'vitest';
import { executePythonScript, executePythonScriptAsync } from '../../../components/network/pc-panel/pcPythonRunner';
import { loadFs, saveFs, writeFile, readFile } from '../../../components/network/pc-panel/pcFileSystem';


const mockStorage: Record<string, string> = {};

if (typeof globalThis.localStorage === 'undefined') {
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, val: string) => { mockStorage[key] = val; },
        clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
        removeItem: (key: string) => { delete mockStorage[key]; },
        length: 0,
        key: () => null,
    };
}

describe('pcPythonRunner tests', () => {
    beforeEach(() => {
        if (typeof localStorage !== 'undefined' && localStorage.clear) {
            localStorage.clear();
        }
    });

    it('should execute simple python scripts', () => {
        const script = `
# Test python script
a = 10
b = 20
print("Sum is:", a + b)
for i in range(3):
    print("Item:", i)
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('Sum is: 30');
        expect(res.output).toContain('Item: 0');
        expect(res.output).toContain('Item: 1');
        expect(res.output).toContain('Item: 2');
        expect(res.error).toBeUndefined();
    });

    it('should execute powers of 2 script with lambda and map', () => {
        const script = `
terms = 10
result = list(map(lambda x: 2 ** x, range(terms)))
print("The total terms are:",terms)
for i in range(terms):
   print("2 raised to power",i,"is",result[i])
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('The total terms are: 10');
        expect(res.output).toContain('2 raised to power 9 is 512');
        expect(res.error).toBeUndefined();
    });

    it('should correctly filter list elements using lambda and modulo operator', () => {
        const script = `
my_list = [12, 65, 54, 39, 102, 339, 221,]
result = list(filter(lambda x: (x % 13 == 0), my_list))
print("Numbers divisible by 13 are", result)
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('Numbers divisible by 13 are [65, 39, 221]');
        expect(res.error).toBeUndefined();
    });

    it('should support bin(), oct(), and hex() conversions', () => {
        const script = `
dec = 344
print("The decimal value of", dec, "is:")
print(bin(dec), "in binary.")
print(oct(dec), "in octal.")
print(hex(dec), "in hexadecimal.")
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('0b101011000 in binary.');
        expect(res.output).toContain('0o530 in octal.');
        expect(res.output).toContain('0x158 in hexadecimal.');
        expect(res.error).toBeUndefined();
    });

    it('should support ord() for character ASCII value calculation', () => {
        const script = `
c = 'p'
print("The ASCII value of '" + c + "' is", ord(c))
`;
        const res = executePythonScript(script);
        expect(res.output).toContain("The ASCII value of 'p' is 112");
        expect(res.error).toBeUndefined();
    });

    it('should calculate factors of a number inside a user-defined function', () => {
        const script = `
def print_factors(x):
   print("The factors of",x,"are:")
   for i in range(1, x + 1):
       if x % i == 0:
           print(i)

num = 320
print_factors(num)
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('The factors of 320 are:');
        expect(res.output).toContain('1');
        expect(res.output).toContain('320');
        expect(res.output).toContain('16');
        expect(res.error).toBeUndefined();
    });

    it('should stream print outputs inside functions when running executePythonScriptAsync', async () => {
        const script = `
def print_factors(x):
   print("The factors of",x,"are:")
   for i in range(1, x + 1):
       if x % i == 0:
           print(i)

num = 320
print_factors(num)
`;
        const streamed: string[] = [];
        const res = await executePythonScriptAsync(script, [], (chunk: string) => streamed.push(chunk));
        expect(streamed.join('\n')).toContain('The factors of 320 are:');
        expect(streamed.join('\n')).toContain('320');
        expect(streamed.join('\n')).toContain('16');
        expect(res.output).toContain('The factors of 320 are:');
    });

    it('should support try...except blocks and avoid running except on valid input', () => {
        const script = `
try:
    num1 = float(input("Enter first number: "))
    num2 = float(input("Enter second number: "))
    print("Result:", num1 + num2)
except:
    print("Invalid input. Please enter a number.")
`;
        const res = executePythonScript(script, ['10', '20']);
        expect(res.output).toContain('Result: 30');
        expect(res.output).not.toContain('Invalid input');
        expect(res.error).toBeUndefined();
    });

    it('should execute full calculator script correctly with except ValueError', () => {
        const script = `
def add(x, y):
    return x + y

while True:
    choice = input("Enter choice(1/2/3/4): ")
    if choice in ('1', '2', '3', '4'):
        try:
            num1 = float(input("Enter first number: "))
            num2 = float(input("Enter second number: "))
        except ValueError:
            print("Invalid input. Please enter a number.")
            continue

        if choice == '1':
            print(num1, "+", num2, "=", add(num1, num2))

        next_calc = input("Let's do next calculation? (yes/no): ")
        if next_calc == "no":
            break
`;
        const res1 = executePythonScript(script, ['1', '10', '20', 'no']);
        expect(res1.output).toContain('10 + 20 = 30');
        expect(res1.output).not.toContain('Invalid input');

        const res2 = executePythonScript(script, ['1', 'abc', '1', '10', '20', 'no']);
        expect(res2.output).toContain('Invalid input. Please enter a number.');
        expect(res2.output).toContain('10 + 20 = 30');
    });

    it('should support itertools.product, random.shuffle, and chained indexing deck[i][0]', () => {
        const script = `
import itertools, random
deck = list(itertools.product(range(1,14),['Spade','Heart','Diamond','Club']))
random.shuffle(deck)
print("You got:")
for i in range(5):
   print(deck[i][0], "of", deck[i][1])
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('You got:');
        expect(res.output).not.toContain('None of None');
        expect(res.output).toMatch(/\d+ of (Spade|Heart|Diamond|Club)/);
        expect(res.error).toBeUndefined();
    });

    it('should support calendar module and calendar.month(yy, mm)', () => {
        const script = `
import calendar
yy = 2014
mm = 11
print(calendar.month(yy, mm))
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('November 2014');
        expect(res.output).toContain('Mo Tu We Th Fr Sa Su');
        expect(res.output).toContain('30');
        expect(res.error).toBeUndefined();
    });

    it('should support recursive Fibonacci sequence with return(expr) and nterms = 10', () => {
        const script = `
def recur_fibo(n):
   if n <= 1:
       return n
   else:
       return(recur_fibo(n-1) + recur_fibo(n-2))

nterms = 10

if nterms <= 0:
   print("Plese enter a positive integer")
else:
   print("Fibonacci sequence:")
   for i in range(nterms):
       print(recur_fibo(i))
`;
        const res = executePythonScript(script);
        expect(res.output).toContain('Fibonacci sequence:');
        expect(res.output).toContain('0');
        expect(res.output).toContain('1');
        expect(res.output).toContain('34');
        expect(res.error).toBeUndefined();
    });

    it('should support open(), with open(), f.read(), f.write(), line iteration, and mail merger script', () => {
        const devId = 'pc-mail-merger-test';
        const fs = loadFs(devId);
        writeFile(fs, 'C:\\names.txt', 'Ahmet\n Ayse\nMehmet');
        writeFile(fs, 'C:\\body.txt', 'Sisteme hosgeldiniz!\nIyi calismalar.');
        saveFs(devId, fs);

        const script = `
with open("names.txt", 'r', encoding='utf-8') as names_file:
    with open("body.txt", 'r', encoding='utf-8') as body_file:
        body = body_file.read()
        for name in names_file:
            mail = "Hello " + name.strip() + "\\n" + body
            with open(name.strip() + ".txt", 'w', encoding='utf-8') as mail_file:
                mail_file.write(mail)
`;
        const res = executePythonScript(script, [], undefined, devId);
        expect(res.error).toBeUndefined();

        const updatedFs = loadFs(devId);
        expect(readFile(updatedFs, 'C:\\Ahmet.txt')).toBe('Hello Ahmet\nSisteme hosgeldiniz!\nIyi calismalar.');
        expect(readFile(updatedFs, 'C:\\Ayse.txt')).toBe('Hello Ayse\nSisteme hosgeldiniz!\nIyi calismalar.');
        expect(readFile(updatedFs, 'C:\\Mehmet.txt')).toBe('Hello Mehmet\nSisteme hosgeldiniz!\nIyi calismalar.');
    });
});
