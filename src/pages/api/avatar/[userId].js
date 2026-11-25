import { eq } from "drizzle-orm";
import { user as userTable } from "@/auth-schema";
import { db } from "@/db";
import { getAvatarSvg, renderAvatarPng } from "@/utils/avatar";

export const GET = async ({ params }) => {
    const match = params.userId?.match(/^([^/]+?)(\.png)?$/);
    if (!match) return new Response("Not found", { status: 404 });
    const [, userId, extension] = match;
    const png = Boolean(extension);

    const [user] = await db
        .select({
            image: userTable.image,
            name: userTable.name,
            email: userTable.email,
        })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

    if (!user) return new Response("Not found", { status: 404 });

    if (user.image?.startsWith("data:")) {
        const [metadata, encodedData] = user.image.split(",", 2);
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

    if (user.image?.startsWith("http")) {
        return Response.redirect(user.image, 302);
    }

    const svg = getAvatarSvg({
        name: user.name || user.email,
    });

    if (png) {
        return new Response(await renderAvatarPng(svg), {
            headers: {
                "Cache-Control": "no-cache",
                "Content-Type": "image/png",
            },
        });
    }

    return new Response(svg, {
        headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "image/svg+xml; charset=utf-8",
        },
    });
};

export const prerender = false;
