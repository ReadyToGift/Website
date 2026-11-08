import { sequence } from "astro:middleware";
import { auth } from "@/auth";

const setAuth = async (context, next) => {
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
