import { JWT_COOKIE } from "@/server/auth";
import { createSessionClient } from "@/server/appwrite";
import { JWT_DURATION } from "astro:env/client";

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
        maxAge: JWT_DURATION
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