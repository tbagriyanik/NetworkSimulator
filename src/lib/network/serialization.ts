type SerializedTag = 'Map' | 'Set' | 'Date';

type TaggedValue = {
  __type: SerializedTag;
  value: unknown;
};

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return { __type: 'Map', value: Array.from(value.entries()) } as TaggedValue;
  }
  if (value instanceof Set) {
    return { __type: 'Set', value: Array.from(value.values()) } as TaggedValue;
  }
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() } as TaggedValue;
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const tagged = value as Partial<TaggedValue>;
  if (!tagged.__type) return value;
  if (tagged.__type === 'Map' && Array.isArray(tagged.value)) return new Map(tagged.value as [unknown, unknown][]);
  if (tagged.__type === 'Set' && Array.isArray(tagged.value)) return new Set(tagged.value as unknown[]);
  if (tagged.__type === 'Date' && typeof tagged.value === 'string') return new Date(tagged.value);
  return value;
}

export function safeStringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}

export function safeParse<T>(raw: string): T {
  return JSON.parse(raw, reviver) as T;
}
