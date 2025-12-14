import { AppwriteException } from "node-appwrite";
import authStore from "./stores/auth";
import { createSessionClient } from "./server/appwrite";
import { defineMiddleware } from "astro:middleware";
import { loadPrefs } from "./stores/prefs";

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, locals } = context;
    const url = new URL(request.url);
    locals.user = {
        account: null,
        requiresMFA: false,
        session: null,
        prefs: {}
    };

    if (context.isPrerendered) return next();

    try {
        const { account, session } = createSessionClient({ request });
        locals.user.account = await account.get();
        locals.user.session = session;
        locals.user.prefs = await account.getPrefs();
            
        authStore.init({ user: locals.user.account, session: locals.user.session });
        loadPrefs(locals.user.prefs);
    } catch (error) {
        locals.user.account = null;
        if (error instanceof AppwriteException) {
            if (error.type === "user_more_factors_required" && url.pathname !== "/dash/auth/mfa") {
                locals.user.requiresMFA = true;
            }
        }
    }

    return next();
});
