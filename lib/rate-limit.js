const buckets = globalThis.__spicedbUiRateLimits || new Map();
globalThis.__spicedbUiRateLimits = buckets;

export function enforceRateLimit(req, res, { name, limit, windowMs }) {
  const forwarded = req.headers['x-forwarded-for'];
  const address = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket?.remoteAddress) || 'unknown';
  const key = `${name}:${address}`;
  const now = Date.now();
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);

  res.setHeader('RateLimit-Limit', String(limit));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
  res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count > limit) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ message: 'Too many requests. Try again shortly.' });
    return false;
  }

  if (buckets.size > 5000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  }
  return true;
}
