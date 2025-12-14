import authStore from "./stores/auth";
import { createSessionClient } from "./server/appwrite";
import { defineMiddleware } from "astro:middleware";
import { loadPrefs } from "./stores/prefs";

export const onRequest = defineMiddleware(async (context, next) => {
    const { request, locals } = context;
    locals.user = {
        account: null,
        avatar: null,
        session: null,
        mfaFactors: [],
        prefs: {}
    };

    if (context.isPrerendered) return next();

    try {
        const { account, session } = createSessionClient({ request });
        locals.user.session = session;
        [
            locals.user.account,
            locals.user.prefs,
            locals.user.mfaFactors
        ] = await Promise.all([
            account.get(),
            account.getPrefs(),
            account.listMFAFactors()
        ]);

        authStore.init({ user: locals.user.account, session: locals.user.session, factors: locals.user.mfaFactors });
        loadPrefs(locals.user.prefs);
    } catch {
        locals.user.account = null;
    }

    return next();
});
