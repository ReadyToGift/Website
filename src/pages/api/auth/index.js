import { createSessionClient, SESSION_COOKIE } from "@/server/appwrite";

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