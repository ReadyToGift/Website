import { defineMiddleware } from "astro:middleware";
import { getAuth } from "@/server/getAuth";

export const onRequest = defineMiddleware(async (context, next) => {
    const { locals } = context;

    locals.user = await getAuth(context);

    return next();
});
