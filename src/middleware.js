import { defineMiddleware } from "astro:middleware";

import { createSessionClient } from "@/server/appwrite";

const REFRESH_WINDOW_MS = 2 * 60 * 1000;
const JWT_COOKIE = "appwrite";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const parseCookies = (cookies) => {
    const map = new Map();
    for (const cookie of cookies.split(";")) {
        const [name, value] = cookie.split("=");
        map.set(name.trim(), value ?? null);
    }
    return map;
};

const extractJwt = ({ request }) => {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }

    const cookies = parseCookies(request.headers.get("cookie") ?? "");
    return cookies.get(JWT_COOKIE);
};

const decodeBase64Url = (value) => {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    return atob(padded);
};

const getJwtExpiryMs = (jwt) => {
    try {
        const payloadBase64 = jwt.split(".")[1];
        if (!payloadBase64) return null;

        const payload = JSON.parse(decodeBase64Url(payloadBase64));
        if (!payload?.exp) return null;

        return payload.exp * 1000;
    } catch {
        return null;
    }
};

const shouldRefreshJwt = (jwt) => {
    const expiryMs = getJwtExpiryMs(jwt);
    if (!expiryMs) {
        // If we can't decode exp, attempt refresh once and let Appwrite validate it.
        return true;
    }

    return expiryMs - Date.now() <= REFRESH_WINDOW_MS;
};

const buildReauthUrl = (request) => {
    const currentUrl = new URL(request.url);
    const reauthUrl = new URL("/auth/reauth", currentUrl.origin);
    reauthUrl.searchParams.set("redirect", `${currentUrl.pathname}${currentUrl.search}`);
    return reauthUrl;
};

export const onRequest = defineMiddleware(async ({ request, cookies, locals }, next) => {
    if (request.method !== "GET") {
        return next();
    }

    if (!import.meta.env.SSR) {
        return next();
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/auth/reauth")) {
        return next();
    }

    const jwt = extractJwt({ request });

    if (!jwt) {
        return next();
    }

    const expiryMs = getJwtExpiryMs(jwt);
    if (expiryMs && expiryMs <= Date.now()) {
        return Response.redirect(buildReauthUrl(request), 302);
    }

    let sessionClient;

    try {
        sessionClient = createSessionClient({ jwt });

        const account = await sessionClient.account.get(); // TODO: Get account from cache with low ttl
        if (!account) {
            cookies.delete(JWT_COOKIE, { path: "/" });
            return next();
        }

        locals.session = { sessionClient, account };
    } catch {
        cookies.delete(JWT_COOKIE, { path: "/" });
        return next();
    }

    if (!shouldRefreshJwt(jwt)) {
        return next();
    }

    try {
        const newJwtResp = await sessionClient.account.createJWT();

        cookies.set(JWT_COOKIE, newJwtResp.jwt, {
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_COOKIE_MAX_AGE
        });
    } catch {
        // Cookie is stale/invalid. Clearing prevents repeated failing auth attempts on SSR.
        cookies.delete(JWT_COOKIE, { path: "/" });
    }

    return next();
});
