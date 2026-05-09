// In-memory rate limiter — 1 video per IP every 12 minutes
const requests = new Map();

const LIMIT = 1;           // max requests
const WINDOW_MS = 12 * 60 * 1000; // 12 minutes in ms

export function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requests.get(ip) || [];

  // Filter out requests older than 12 minutes
  const recent = userRequests.filter(t => now - t < WINDOW_MS);

  if (recent.length >= LIMIT) {
    const oldestRequest = recent[0];
    const retryAfterMs = WINDOW_MS - (now - oldestRequest);
    const retryAfterMin = Math.ceil(retryAfterMs / 60000);
    return {
      allowed: false,
      retryAfterMin,
      message: `Rate limit exceeded. Please wait ${retryAfterMin} minute(s) before processing another video.`
    };
  }

  // Allow and record this request
  recent.push(now);
  requests.set(ip, recent);
  return { allowed: true };
}
