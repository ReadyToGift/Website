import { createSessionClient, SESSION_COOKIE } from "@/server/appwrite";
import { AppwriteException } from "appwrite";
import { sendLoginNotification } from "@/server/auth/login/login-email";


export const prerender = false;

export async function POST(req) {
    const { request, cookies } = req;
    const { code, factor } = await request.json();
    if (!code || !factor) {
        return new Response(JSON.stringify({ message: "Missing code or factor" }), { status: 400 });
    }

    if (cookies.has(SESSION_COOKIE) === false) {
        return new Response(JSON.stringify({ message: "No active session" }), { status: 401 });
    }

    try {
        const client = createSessionClient({ request });

        const challenge = await client.account.createMFAChallenge({
            factor: factor
        });

        const challengeId = challenge.$id;

        await client.account.updateMFAChallenge({
            challengeId: challengeId,
            otp: code
        });

        const user = await client.account.get();

        const ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || "";

        try {
            await sendLoginNotification({ userId: user.$id, ip });
        } catch (emailError) {
            console.error("Error sending login notification email:", emailError);
        }

        return new Response(200);
    } catch (error) {
        if (error instanceof AppwriteException) {
            console.error("Appwrite error completing MFA challenge:", error);
            console.log(error.response);
            return new Response(error.response, { 
                status: error.code || 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.error("Error completing MFA challenge:", error);
        return new Response("Error completing MFA challenge", { status: 500 });
    }
}