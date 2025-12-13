import { createSessionClient } from "@/server/appwrite";

export const prerender = false;

export async function POST(req) {
    const { request } = req;
    const { code, factor } = await request.json();
    if (!code || !factor) {
        return new Response("Missing code or factor", { status: 400 });
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

        return new Response(200);
    } catch (error) {
        console.error("Error completing MFA challenge:", error);
        return new Response("Error completing MFA challenge", { status: 500 });
    }
}