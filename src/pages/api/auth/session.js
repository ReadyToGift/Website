import { JWT_COOKIE, SESSION_COOKIE_MAX_AGE } from "@/server/auth";
import { createSessionClient } from "@/server/appwrite";

export const prerender = false;

export const GET = async ({ request }) => {
    try {
        const sessionClient = createSessionClient({ request });
        const account = await sessionClient.account.get();

        if (!account) {
            return new Response(JSON.stringify({ authenticated: false }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ authenticated: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const POST = async ({ request, cookies }) => {
    const { jwt } = await request.json();

    if (!jwt) {
        return new Response(JSON.stringify({ message: "Missing jwt" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    cookies.set(JWT_COOKIE, jwt, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_COOKIE_MAX_AGE
    });

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};

export const DELETE = async ({ cookies }) => {
    cookies.delete(JWT_COOKIE, { path: "/" });
    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};