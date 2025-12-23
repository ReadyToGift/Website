import { createAdminClient } from "@/server/appwrite";
import { ID } from "appwrite";

export const sendLoginNotification = async ({ userId, ip }) => {
    const { messaging } = createAdminClient();

    const loginEmail = await messaging.createEmail({
        messageId: ID.unique(),
        subject: "New Login Notification",
        content: `A new login to your account was detected from IP address: ${ip} on ${new Date().toLocaleString()}. If this was not you, please secure your account immediately.`,
        users: [userId]
    });

    return loginEmail;
};