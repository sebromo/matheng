type RateBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateBucket>();

export function allowWrite(
  key: string,
  limit = 120,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 10_000) {
      for (const [currentKey, value] of buckets)
        if (value.resetAt <= now) buckets.delete(currentKey);
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
