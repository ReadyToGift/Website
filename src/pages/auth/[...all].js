import { auth } from "@/auth.js";

export const ALL = async (ctx) => {
    return auth.handler(ctx.request);
};
