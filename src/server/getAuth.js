import { createSessionClient } from "@/server/appwrite";

export const getAuth = async (context) => {
    const startTime = Date.now();
    let account = null;
    let session = null;
    let mfaFactors = [];
    let prefs = {};

    if (!context.isPrerendered) {
        try {
            const { request } = context;
            const sessionClient = createSessionClient({ request });
            const accountClient = sessionClient.account;
            session = sessionClient.session;
    
            [account, mfaFactors, prefs] = await Promise.all([
                accountClient.get(),
                accountClient.listMFAFactors(),
                accountClient.getPrefs()
            ]);
        } catch {} // eslint-disable-line no-empty
        const endTime = Date.now();
        console.log(`GetAuth took ${endTime - startTime}ms`);
    }

    return { account, session, mfaFactors, prefs };
};