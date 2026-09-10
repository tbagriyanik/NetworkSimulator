import { describe, it, expect, beforeEach } from 'vitest';
import { encryptData, decryptData, setSecureItem, getSecureItem } from '@/lib/security/secureStorage';

describe('secureStorage (Web Crypto API AES-GCM)', () => {
  beforeEach(() => {
    let store: Record<string, string> = {};
    if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
      globalThis.localStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = String(value); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        length: 0,
        key: () => null,
      };
    } else {
      globalThis.localStorage.clear();
    }
  });

  it('should encrypt and decrypt string payloads correctly', async () => {
    const plain = 'Secret Network State Payload';
    const encrypted = await encryptData(plain);

    expect(encrypted).not.toBe(plain);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(plain);
  });

  it('should store and retrieve complex JSON objects in localStorage securely', async () => {
    const originalData = {
      deviceId: 'pc-1',
      ipAddress: '192.168.1.10',
      routes: [{ destination: '0.0.0.0/0', gateway: '192.168.1.1' }],
    };

    await setSecureItem('test_network_state', originalData);

    const storedRaw = localStorage.getItem('test_network_state');
    expect(storedRaw).not.toBeNull();
    expect(storedRaw).not.toContain('192.168.1.10');

    const retrieved = await getSecureItem<typeof originalData>('test_network_state');
    expect(retrieved).toEqual(originalData);
  });

  it('should return null when decrypting invalid or corrupted payloads', async () => {
    const result = await decryptData('InvalidCorruptedPayload!!!');
    expect(result).toBeNull();
  });
});
