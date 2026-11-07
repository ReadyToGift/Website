import { Plunk } from "plunk-node-sdk";

export const sendEmail = async ({ to, subject, body }) => {
    console.log(`Sending email to ${to}`);
    const { PLUNK_BASE_URL, PLUNK_SECRET_KEY, PLUNK_SENDING_EMAIL } =
        await import("astro:env/server");
    const plunk = new Plunk({
        secretKey: PLUNK_SECRET_KEY,
        baseUrl: PLUNK_BASE_URL,
        fetch: globalThis.fetch.bind(globalThis),
    });

    await plunk.send({
        name: "ReadyToGift",
        from: PLUNK_SENDING_EMAIL,
        to,
        subject,
        body,
    });

    console.log(`Email sent to ${to}`);
};
