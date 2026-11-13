import { eq } from "drizzle-orm";
import { user } from "@/auth-schema";
import { db } from "@/db";
import { getAvatar } from "@/utils/avatar";

export const GET = async ({ params }) => {
    const [account] = await db
        .select({ image: user.image, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, params.userId))
        .limit(1);

    if (!account) return new Response("Not found", { status: 404 });

    if (account.image?.startsWith("data:")) {
        const [metadata, encodedData] = account.image.split(",", 2);
        const contentType =
            metadata.match(/^data:([^;]+)/)?.[1] || "image/jpeg";
        const body = metadata.includes(";base64")
            ? Uint8Array.from(atob(encodedData), (character) =>
                  character.charCodeAt(0),
              )
            : decodeURIComponent(encodedData);

        return new Response(body, {
            headers: {
                "Cache-Control": "no-cache",
                "Content-Type": contentType,
            },
        });
    }

    if (account.image?.startsWith("http")) {
        return Response.redirect(account.image, 302);
    }

    const dataUri = getAvatar({
        name: account.name || account.email,
        type: "svg",
    });
    const [, encodedSvg] = dataUri.split(",", 2);
    const svg = decodeURIComponent(encodedSvg);

    return new Response(svg, {
        headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "image/svg+xml; charset=utf-8",
        },
    });
};

export const prerender = false;
