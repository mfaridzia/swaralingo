import { describe, it, expect } from 'vitest';
import { retryDelay, isDead, MAX_RETRIES } from './retry';

describe('retryDelay', () => {
  it('returns 1s for first retry', () => {
    expect(retryDelay(0)).toBe(1000);
  });

  it('doubles each attempt', () => {
    expect(retryDelay(1)).toBe(2000);
    expect(retryDelay(2)).toBe(4000);
    expect(retryDelay(3)).toBe(8000);
  });

  it('caps at 60s', () => {
    expect(retryDelay(10)).toBe(60000);
    expect(retryDelay(20)).toBe(60000);
  });
});

describe('isDead', () => {
  it('alive under MAX_RETRIES', () => {
    expect(isDead(0)).toBe(false);
    expect(isDead(9)).toBe(false);
  });

  it('dead at MAX_RETRIES', () => {
    expect(isDead(MAX_RETRIES)).toBe(true);
    expect(isDead(MAX_RETRIES + 1)).toBe(true);
  });
});
