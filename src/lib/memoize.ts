interface MemoizedFunction<T, V> {
  (arg: T): Promise<V>;
  clear: (arg?: T) => void;
}

export function memoizeAsync<T, V>(
  fn: (arg: T) => Promise<V>,
  ttlMs: number,
  keyFn: (arg: T) => string,
): MemoizedFunction<T, V> {
  // Cache values only — never promises. On Cloudflare Workers, a promise
  // created in one request must not be awaited from another request, so
  // in-flight deduplication across callers is intentionally omitted.
  const cache = new Map<string, { value: V; expiresAt: number }>();

  const memoized = async (arg: T): Promise<V> => {
    const key = keyFn(arg);
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    const value = await fn(arg);
    cache.set(key, { value, expiresAt: now + ttlMs });
    return value;
  };

  // Allow clearing specific cache entries or the entire cache
  memoized.clear = (arg?: T) => {
    if (arg !== undefined) {
      cache.delete(keyFn(arg));
    } else {
      cache.clear();
    }
  };

  return memoized;
}
