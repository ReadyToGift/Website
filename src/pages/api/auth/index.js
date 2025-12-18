import { createSessionClient, SESSION_COOKIE } from "@/server/appwrite";
import { getAuth } from "@/server/getAuth";

export const prerender = false;

export async function DELETE(req) {
    const { cookies, request } = req;

    const { account } = createSessionClient({ request: request });
    await account.deleteSession({ sessionId: "current" });
    cookies.delete(SESSION_COOKIE, { path: "/" });
    
    return new Response(null, {
        status: 200 
    });
}

export async function GET(req) {
    const { request } = req;

    const user = await getAuth({ request });

    if (user) {
        return new Response(JSON.stringify({ user }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } else {
        return new Response(JSON.stringify({ user: null }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
}