import { AppwriteException as AdminAppwriteException } from "node-appwrite";
import { createSessionClient, SESSION_COOKIE } from "@/server/appwrite";
import { AppwriteException } from "appwrite";
import { getAuth } from "@/server/getAuth";
import { sendLoginNotification } from "@/server/auth/login/login-email";


export const prerender = false;

export async function DELETE(req) {
    const { cookies, request } = req;
    
    if (!cookies.has(SESSION_COOKIE)) {
        return new Response(null, {
            status: 200 
        });
    }

    try {
        const { account } = createSessionClient({ request: request });
        await account.deleteSession({ sessionId: "current" });
        cookies.delete(SESSION_COOKIE, { path: "/" });
    } catch {} // eslint-disable-line no-empty


    return new Response(null, {
        status: 200 
    });
}

export async function GET(req) {
    const { request } = req;

    const authData = await getAuth({ request });
    
    return new Response(JSON.stringify(authData || null), {
        status: 200,
        headers: {
            "Content-Type": "application/json"
        }
    });
}
export async function POST({ cookies, request }) {
    try {
        const body = await request.json();
        const { sessionSecret, userId } = body;

        if (!sessionSecret) {
            return new Response(JSON.stringify({ error: "Session secret is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Verify the session is valid by trying to get account info
        const { account } = createSessionClient({ session: sessionSecret });
        const accountData = await account.get();

        // Set the session cookie
        cookies.set(SESSION_COOKIE, sessionSecret, {
            path: "/",
            expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            sameSite: "strict",
            secure: true,
            httpOnly: true
        });

        const ip = request.headers.get("x-forwarded-for") || request.headers.get("remote-addr") || "";

        try {
            await sendLoginNotification({ userId: accountData.$id, ip });
        } catch (emailError) {
            console.error("Error sending login notification email:", emailError);
        }

        console.log("User logged in, session validated:", accountData.$id);

        return new Response(JSON.stringify({
            success: true
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

        // try {
        //     const sessionClient = createSessionClient({ session: session.secret });
        //     const user = await sessionClient.account.get();

        //     const ip = request.headers.get("x-forwarded-for") || Astro.request.headers.get("remote-addr") || "";

        //     try {
        //         await sendLoginNotification({ user, ip });
        //     } catch (emailError) {
        //         console.error("Error sending login notification email:", emailError);
        //     }
        // } catch (error) {
        //     if (error instanceof AppwriteException) {
        //         return new Response(error.response, {
        //             status: error.code || 400,
        //             headers: { "Content-Type": "application/json" }
        //         });
        //     }
            
        //     return new Response(JSON.stringify({ error: error.message }), {
        //         status: 400,
        //         headers: { "Content-Type": "application/json" }
        //     });
        // }

    } catch (error) {
        if (error instanceof AdminAppwriteException) {
            return new Response(error.response, {
                status: error.code || 400,
                headers: { "Content-Type": "application/json" }
            });
        }
        
        console.log({ error });

        return new Response(JSON.stringify({ error: "An unexpected error occurred." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
}