import { eq } from "drizzle-orm";
import { user } from "@/auth-schema";
import { db } from "@/db";
import { getAvatar } from "@/utils/avatar";

export const GET = async ({ params }) => {
    const [account] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, params.userId))
        .limit(1);

    if (!account) return new Response("Not found", { status: 404 });

    const dataUri = getAvatar({
        name: account.name || account.email,
        type: "svg",
    });
    const [, encodedSvg] = dataUri.split(",", 2);
    const svg = decodeURIComponent(encodedSvg);

    return new Response(svg, {
        headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
            "Content-Type": "image/svg+xml; charset=utf-8",
        },
    });
};

export const prerender = false;
