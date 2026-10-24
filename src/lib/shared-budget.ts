import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Redis } from "@upstash/redis";
import { RequestError } from "./request";

const PER_IP_LIMIT = 12;
const PER_IP_WINDOW_MS = 60_000;
const GLOBAL_WINDOW_MS = 24 * 60 * 60 * 1_000;

function getSharedStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  const dailyLimit = Number(process.env.MAX_PUBLIC_ANALYSES_PER_DAY);
  if (!url || !token || !secret || secret.length < 32 || !Number.isSafeInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 10_000) {
    throw new RequestError(503, "SHARED_BUDGET_UNCONFIGURED", "Shared request budgeting is not configured. Contact the site operator.");
  }
  const budgetEnvironment = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_ENV : "node";
  return { url, token, secret, dailyLimit, prefix: `fine-print-fighter:${budgetEnvironment}:analysis:v1` };
}

function trustedClientIp(request: Request): string {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER || "x-vercel-forwarded-for";
  if (!/^[a-z0-9-]{1,80}$/i.test(header)) {
    throw new RequestError(503, "SHARED_BUDGET_UNCONFIGURED", "Shared request budgeting is not configured correctly. Contact the site operator.");
  }
  const candidate = request.headers.get(header)?.trim();
  if (!candidate || candidate.includes(",") || isIP(candidate) === 0) {
    throw new RequestError(503, "TRUSTED_CLIENT_IP_UNAVAILABLE", "The hosting platform did not provide a trusted client address. Analysis is unavailable.");
  }
  if (candidate.includes(":")) return new URL(`http://[${candidate}]/`).hostname.slice(1, -1).toLowerCase();
  return candidate.split(".").map(part => String(Number(part))).join(".");
}

function blocked(message: string, reset: number): RequestError {
  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1_000));
  return new RequestError(429, "RATE_LIMITED", message, true, retryAfterSeconds);
}

/** One atomic sorted-set script enforces exact rolling windows and never stores raw IPs. */
export async function enforceSharedAnalysisBudget(request: Request): Promise<void> {
  const { url, token, secret, dailyLimit, prefix } = getSharedStore();
  const ip = trustedClientIp(request);
  const identifier = createHmac("sha256", secret).update(ip).digest("hex");
  const redis = new Redis({
    url,
    token,
    retry: { retries: 0 },
    signal: () => AbortSignal.any([request.signal, AbortSignal.timeout(1_500)]),
  });
  const ipKey = `${prefix}:{budget}:ip:${identifier}`;
  const globalKey = `${prefix}:{budget}:global:24h`;
  const script = `
    redis.replicate_commands()
    local redisTime = redis.call('TIME')
    local now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
    local requestId = ARGV[1]
    local ipLimit = tonumber(ARGV[2])
    local ipWindow = tonumber(ARGV[3])
    local globalLimit = tonumber(ARGV[4])
    local globalWindow = tonumber(ARGV[5])
    local ipKey = KEYS[1]
    local globalKey = KEYS[2]

    redis.call('ZREMRANGEBYSCORE', ipKey, '-inf', now - ipWindow)
    redis.call('ZREMRANGEBYSCORE', globalKey, '-inf', now - globalWindow)

    local ipCount = redis.call('ZCARD', ipKey)
    local globalCount = redis.call('ZCARD', globalKey)
    if ipCount >= ipLimit then
      local oldest = redis.call('ZRANGE', ipKey, 0, 0, 'WITHSCORES')
      return {0, 'ip', tonumber(oldest[2]) + ipWindow}
    end
    if globalCount >= globalLimit then
      local oldest = redis.call('ZRANGE', globalKey, 0, 0, 'WITHSCORES')
      return {0, 'global', tonumber(oldest[2]) + globalWindow}
    end

    redis.call('ZADD', ipKey, now, requestId)
    redis.call('ZADD', globalKey, now, requestId)
    redis.call('EXPIRE', ipKey, math.ceil(ipWindow / 1000) + 1)
    redis.call('EXPIRE', globalKey, math.ceil(globalWindow / 1000) + 1)
    return {1, 'ok', 0}
  `;
  let result: unknown;
  try {
    result = await redis.eval(script, [ipKey, globalKey], [crypto.randomUUID(), String(PER_IP_LIMIT), String(PER_IP_WINDOW_MS), String(dailyLimit), String(GLOBAL_WINDOW_MS)]);
  } catch {
    throw new RequestError(503, "SHARED_BUDGET_UNAVAILABLE", "The shared request-budget service is unavailable. Retry later.", true);
  }
  if (!Array.isArray(result) || result.length !== 3 || ![0, 1].includes(Number(result[0])) || typeof result[1] !== "string" || !Number.isFinite(Number(result[2]))) {
    throw new RequestError(503, "SHARED_BUDGET_UNAVAILABLE", "The shared request-budget service returned an invalid response. Retry later.", true);
  }
  if (Number(result[0]) === 0 && result[1] === "ip") throw blocked("This network has reached its analysis limit. Please try again later.", Number(result[2]));
  if (Number(result[0]) === 0 && result[1] === "global") throw blocked("The daily demo analysis budget has been reached. Please try again later.", Number(result[2]));
  if (Number(result[0]) !== 1 || result[1] !== "ok") throw new RequestError(503, "SHARED_BUDGET_UNAVAILABLE", "The shared request-budget service returned an invalid response. Retry later.", true);
}
