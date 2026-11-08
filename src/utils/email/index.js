import mjml2html from "mjml";
import { Plunk } from "plunk-node-sdk";
import templateContent from "./templates/email-template.mjml?raw";

const getFooter = ({ footer, contactSupportDefaultSubject }) => {
    let mailto = `mailto:support@readyto.gift`;
    if (contactSupportDefaultSubject) {
        mailto += `?subject=${encodeURIComponent(contactSupportDefaultSubject)}`;
    }

    const baseFooter = `This mailbox does not accept responses. Please contact <a href="${mailto}">support@readyto.gift</a> for any questions.`;

    if (!footer) return baseFooter;

    return `${footer}<br/><br/>${baseFooter}`;
};

const createEmail = async ({ greeting, body, footer, preview }) => {
    const populatedTemplate = templateContent
        .replace("{{body}}", body)
        .replace("{{footer}}", footer)
        .replace("{{greeting}}", greeting)
        .replace("{{preview}}", preview);

    const { html } = await mjml2html(populatedTemplate);
    return html;
};

export const sendEmail = async ({
    to,
    name,
    subject,
    body,
    footer,
    contactSupportDefaultSubject,
    preview,
}) => {
    console.log(`Sending email to ${to}`);
    const { PLUNK_BASE_URL, PLUNK_SECRET_KEY, PLUNK_SENDING_EMAIL } =
        await import("astro:env/server");
    const plunk = new Plunk({
        secretKey: PLUNK_SECRET_KEY,
        baseUrl: PLUNK_BASE_URL,
        fetch: globalThis.fetch.bind(globalThis),
    });

    const greeting = name ? `Hello ${name},` : "Hello";

    const html = await createEmail({
        greeting,
        body,
        preview,
        footer: getFooter({ footer, contactSupportDefaultSubject }),
    });

    await plunk.send({
        name: "ReadyToGift",
        from: PLUNK_SENDING_EMAIL,
        to,
        subject,
        body: html,
    });

    console.log(`Email sent to ${to}`);
};
