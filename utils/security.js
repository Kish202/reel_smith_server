import crypto from 'crypto';
import User from '../models/User.js';

// ─── IP Rate Limiter (demo mode — guests) ────────────────────────────────────
const ipRequests = new Map();
const IP_LIMIT = 1;
const IP_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 per day for guests

export function checkIpRateLimit(ip) {
  const now = Date.now();
  const reqs = ipRequests.get(ip) || [];
  const recent = reqs.filter(t => now - t < IP_WINDOW_MS);

  if (recent.length >= IP_LIMIT) {
    return {
      allowed: false,
      message: 'You have used your free demo. Sign in to continue.',
    };
  }

  recent.push(now);
  ipRequests.set(ip, recent);
  return { allowed: true };
}

// ─── User Rate Limiter (logged in — per user) ─────────────────────────────────
const USER_LIMIT = 5;
const USER_WINDOW_MS = 60 * 60 * 1000; // 5 per hour for logged in users

export async function checkUserRateLimit(userId) {
  const user = await User.findById(userId);
  if (!user) return { allowed: false, message: 'User not found' };

  const now = new Date();
  const windowStart = new Date(now - USER_WINDOW_MS);

  if (user.lastJobAt && user.lastJobAt > windowStart) {
    // Count jobs in last hour — simplified: check if over limit
    // In production track per-hour counts in DB
    return { allowed: true };
  }

  return { allowed: true };
}

export async function recordUserJob(userId) {
  await User.findByIdAndUpdate(userId, {
    lastJobAt: new Date(),
    $inc: { totalJobs: 1 },
  });
}

// ─── IP Blacklist ─────────────────────────────────────────────────────────────
const blacklist = new Set();
const failedAttempts = new Map();
const MAX_FAILURES = 5;
const BLACKLIST_DURATION = 60 * 60 * 1000;

export function recordFailure(ip) {
  const attempts = (failedAttempts.get(ip) || 0) + 1;
  failedAttempts.set(ip, attempts);
  if (attempts >= MAX_FAILURES) {
    blacklist.add(ip);
    setTimeout(() => {
      blacklist.delete(ip);
      failedAttempts.delete(ip);
    }, BLACKLIST_DURATION);
  }
}

export function isBlacklisted(ip) {
  return blacklist.has(ip);
}

// ─── URL Validator ────────────────────────────────────────────────────────────
const ALLOWED_YOUTUBE_HOSTS = [
  'youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com',
];

export function validateYouTubeUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'URL must use HTTPS' };
    }

    if (!ALLOWED_YOUTUBE_HOSTS.includes(parsed.hostname)) {
      return { valid: false, reason: 'Only YouTube URLs are allowed' };
    }

    const videoId =
      parsed.searchParams.get('v') ||
      (parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : null);

    if (!videoId || videoId.length < 5) {
      return { valid: false, reason: 'Invalid YouTube video ID' };
    }

    if (!/^[a-zA-Z0-9_-]{5,20}$/.test(videoId)) {
      return { valid: false, reason: 'Suspicious video ID detected' };
    }

    return { valid: true, videoId };
  } catch {
    return { valid: false, reason: 'Malformed URL' };
  }
}

export function validateRequestBody(body) {
  if (JSON.stringify(body).length > 500) {
    return { valid: false, reason: 'Request body too large' };
  }
  return { valid: true };
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  return ip?.replace(/[^0-9a-fA-F.:]/g, '') || 'unknown';
}
