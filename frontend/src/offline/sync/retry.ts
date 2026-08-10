export const MAX_RETRIES = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 60000;

export function retryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 60s
  const delay = BASE_DELAY * Math.pow(2, attempt);
  return Math.min(delay, MAX_DELAY);
}

export function isDead(attempt: number): boolean {
  return attempt >= MAX_RETRIES;
}
