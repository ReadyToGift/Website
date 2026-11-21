import {
    autofillRateLimiter,
    consumeRateLimit,
    rateLimiter,
    reportRateLimiter,
} from "@/server/platform";

const limiters = {
    api: {
        binding: rateLimiter,
        limit: 60,
        windowSeconds: 60,
    },
    report: {
        binding: reportRateLimiter,
        limit: 5,
        windowSeconds: 60,
    },
    autofill: {
        binding: autofillRateLimiter,
        limit: 5,
        windowSeconds: 60,
    },
};

const tooManyRequests = (retryAfter) =>
    new Response(
        JSON.stringify({
            message: "Too many requests, try again in a few minutes",
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(retryAfter),
            },
        },
    );

export const enforceRateLimit = async (context, name = "api") => {
    const config = limiters[name];
    if (!config) throw new Error(`Unknown rate limit: ${name}`);

    const identity =
        context.locals.user?.id ||
        `ip:${context.request.headers.get("CF-Connecting-IP") || "unknown"}`;
    const key = `${name}:${identity}`;

    const allowed = config.binding
        ? (await config.binding.limit({ key })).success
        : await consumeRateLimit({
              key,
              limit: config.limit,
              windowSeconds: config.windowSeconds,
          });

    return allowed ? null : tooManyRequests(config.windowSeconds);
};
