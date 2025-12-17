import { createAdminClient } from "@/server/appwrite";
import { ID } from "appwrite";

export const sendLoginNotification = async ({ user, ip }) => {
    const { messaging } = createAdminClient();

    console.log("Preparing to send login notification email to user:", user);



    const emailTarget = user.targets.find((target) => target.providerType === "email");

    console.log({ targets: user.targets, emailTarget });

    if (!user.emailVerification) {
        console.log("No verified email target found for user:", user.$id);
        return new Response("OK", { status: 200 });
    }

    const loginEmail = await messaging.createEmail({
        messageId: ID.unique(),
        subject: "New Login Notification",
        content: `A new login to your account was detected from IP address: ${ip} on ${new Date().toLocaleString()}. If this was not you, please secure your account immediately.`,
        users: [user.$id]
    });

    return loginEmail;
};