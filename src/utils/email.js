import {
    PLUNK_BASE_URL,
    PLUNK_SECRET_KEY,
    PLUNK_SENDING_EMAIL,
} from "astro:env/server";
import { Plunk } from "plunk-node-sdk";

const plunk = new Plunk({
    secretKey: PLUNK_SECRET_KEY,
    baseUrl: PLUNK_BASE_URL,
});

export const sendEmail = async ({ to, subject, body }) => {
    await plunk.send({
        from: PLUNK_SENDING_EMAIL,
        to,
        subject,
        html: body,
    });
};
