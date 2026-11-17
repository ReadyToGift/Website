import { sequence } from "astro:middleware";

const setAuth = async (context, next) => {
    if (["/api/version", "/404"].includes(context.routePattern)) return next();

    const { auth } = await import("@/auth");
    const isAuthed = await auth.api.getSession({
        headers: context.request.headers,
    });

    if (isAuthed) {
        context.locals.user = isAuthed.user;
        context.locals.session = isAuthed.session;
    } else {
        context.locals.user = null;
        context.locals.session = null;
    }

    return next();
};

export const onRequest = sequence(setAuth);
