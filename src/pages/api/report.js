import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, lists } from "@/schema";
import { getEnv } from "@/server/platform";
import { sendEmail } from "@/utils/email/index";
import { escapeHtml, MAX_TEXT_LENGTHS, sanitizeText } from "@/utils/validation";

export const prerender = false;

const REPORT_REASONS = new Set([
    "Spam or advertising",
    "Inappropriate or offensive content",
    "Misleading or unsafe link",
    "Copyright or privacy concern",
    "Something else",
]);

const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

export const POST = async (context) => {
    try {
        const body = await context.request.json();
        const { details = "", itemId, listId, reason } = body || {};

        const cleanDetails = sanitizeText(
            details,
            MAX_TEXT_LENGTHS.reportDetails,
        );
        if (
            typeof listId !== "string" ||
            !listId ||
            typeof reason !== "string" ||
            !REPORT_REASONS.has(reason) ||
            typeof details !== "string" ||
            cleanDetails === null ||
            details.length > MAX_TEXT_LENGTHS.reportDetails
        ) {
            return json({ message: "Invalid report" }, 400);
        }

        const [list] = await db
            .select({ id: lists.id, title: lists.title })
            .from(lists)
            .where(eq(lists.id, listId));
        if (!list) return json({ message: "List not found" }, 404);

        let item = null;
        if (itemId !== undefined) {
            if (typeof itemId !== "string" || !itemId) {
                return json({ message: "Invalid item" }, 400);
            }
            [item] = await db
                .select({ id: items.id, title: items.title, url: items.url })
                .from(items)
                .where(
                    and(eq(items.id, itemId), eq(items.communityList, listId)),
                );
            if (!item)
                return json({ message: "Community item not found" }, 404);
        }

        const reporter = context.locals.user;
        const pageUrl = new URL(`/list/${listId}`, context.url.origin).href;
        const subject = `${item ? "Community item" : "List"} report: ${list.title}`;
        const content = [
            `<strong>Reason:</strong> ${escapeHtml(reason)}`,
            `<strong>List:</strong> ${escapeHtml(list.title)} (${escapeHtml(list.id)})`,
            item
                ? `<strong>Item:</strong> ${escapeHtml(item.title)} (${escapeHtml(item.id)})<br><strong>Item URL:</strong> ${escapeHtml(item.url || "Not provided")}`
                : null,
            `<strong>Page:</strong> <a href="${escapeHtml(pageUrl)}">${escapeHtml(pageUrl)}</a>`,
            `<strong>Reporter:</strong> ${escapeHtml(reporter?.email || "Not signed in")}`,
            cleanDetails
                ? `<strong>Details:</strong><br>${escapeHtml(cleanDetails).replaceAll("\n", "<br>")}`
                : null,
        ]
            .filter(Boolean)
            .join("<br><br>");

        await sendEmail({
            to: getEnv("REPORT_EMAIL") || "report@readyto.gift",
            subject,
            body: content,
            preview: subject,
            replyTo: reporter?.email,
        });

        return json({ ok: true });
    } catch (error) {
        console.error("Failed to send content report", error);
        return json({ message: "Unable to send report" }, 500);
    }
};
