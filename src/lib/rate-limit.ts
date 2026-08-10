/**
 * Token-bucket rate limiter using Redis (DB locks).
 * Bucket key = `rl:{scope}:{identifier}`.
 *
 *  - capacity: max tokens
 *  - refillPerSec: tokens added per second
 *  - cost: tokens consumed per call (default 1)
 */
import { getRedis } from './redis';

const SCRIPT = `
local key      = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill   = tonumber(ARGV[2])
local cost     = tonumber(ARGV[3])
local now      = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts     = tonumber(data[2])

if not tokens then
  tokens = capacity
  ts = now
end

local delta = math.max(0, now - ts) / 1000.0
tokens = math.min(capacity, tokens + delta * refill)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', key, math.ceil((capacity / refill) * 1000) + 1000)
return { allowed, math.floor(tokens) }
`;

export interface RateLimitOptions {
    scope: string;
    identifier: string;
    capacity: number;
    refillPerSec: number;
    cost?: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
    const redis = getRedis('locks');
    const key = `rl:${opts.scope}:${opts.identifier}`;
    const res = (await redis.eval(
        SCRIPT,
        1,
        key,
        String(opts.capacity),
        String(opts.refillPerSec),
        String(opts.cost ?? 1),
        String(Date.now())
    )) as [number, number];
    return { allowed: res[0] === 1, remaining: res[1] };
}
