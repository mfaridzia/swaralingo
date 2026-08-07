import { AUTH_MAX_REQUESTS, AUTH_LIMIT_WINDOW_MS, ANALYZE_MAX_REQUESTS, ANALYZE_LIMIT_WINDOW_MS } from '../config.js';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const authRateLimiter = async (c: any, next: any) => {
  const ip = c.req.header('x-forwarded-for') || 'local-ip';
  const now = Date.now();
  
  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + AUTH_LIMIT_WINDOW_MS };
  }
  
  record.count++;
  rateLimitMap.set(ip, record);
  
  if (record.count > AUTH_MAX_REQUESTS) {
    return c.json({ success: false, error: 'Too many requests. Please try again in 1 minute.' }, 429);
  }
  
  await next();
};

const analyzeRateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const analyzeRateLimiter = async (c: any, next: any) => {
  const ip = c.req.header('x-forwarded-for') || 'local-ip';
  let userIdStr = '';
  
  try {
    const body = await c.req.raw.clone().json();
    if (body && body.userId) {
      userIdStr = `user-${body.userId}`;
    }
  } catch (e) {}
  
  const limitKey = userIdStr || ip;
  const now = Date.now();
  
  let record = analyzeRateLimitMap.get(limitKey);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + ANALYZE_LIMIT_WINDOW_MS };
  }
  
  record.count++;
  analyzeRateLimitMap.set(limitKey, record);
  
  if (record.count > ANALYZE_MAX_REQUESTS) {
    return c.json({ success: false, error: 'Too many requests. Please try again in 1 minute.' }, 429);
  }
  
  await next();
};
