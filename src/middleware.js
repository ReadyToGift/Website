import { AppwriteException } from "node-appwrite";
import { createSessionClient } from "./server/appwrite";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, locals } = context;
    // const url = new URL(request.url);
    try {
        const { account } = createSessionClient(request);
        locals.user = await account.get();
    } catch (error) {
        // if (error instanceof AppwriteException) {
        //     if (error.type === "user_more_factors_required" && url.pathname !== "/dash/auth/mfa") {
        //         // User needs to complete MFA
        //         return new Response(null, {
        //             status: 303,
        //             headers: {
        //                 Location: "/dash/auth/mfa?redirect=" + encodeURIComponent(new URL(request.url).pathname)
        //             }
        //         });
        //     }
        // }
    }  

    return next();
});
