// Additional per-process backstop. The randomly generated access key is the
// primary brute-force defense; serverless instances do not share this map.
const attempts = new Map<string, { count: number; until: number }>();
export function allowAttempt(key: string, now = Date.now()) {
  for (const [id, item] of attempts) if (item.until <= now) attempts.delete(id);
  const current = attempts.get(key);
  if (current) {
    if (current.count >= 10) return false;
    current.count++;
  } else {
    if (attempts.size >= 1000) return false;
    attempts.set(key, { count: 1, until: now + 5 * 60_000 });
  }
  return true;
}
