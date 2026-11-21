<template>
    <v-container class="privacy-page" max-width="900">
        <v-card elevation="0" class="pa-6 pa-md-10">
            <p class="text-overline text-primary mb-2">Readyto.gift</p>
            <h1 class="text-h3 text-primary mb-2">Privacy Policy</h1>
            <p class="text-body-2 text-medium-emphasis mb-8">
                Last updated: 21 November 2026
            </p>

            <p>
                This Privacy Policy explains what personal information
                Readyto.gift collects, why we use it, who we share it with, and
                the choices available to you. Readyto.gift is operated by Jack
                Bailey.
            </p>

            <h2>Information we collect</h2>
            <p>We collect the following information:</p>
            <ul>
                <li>
                    <strong>Account information:</strong>
                    your name, email address, password credentials, verification
                    status and account settings.
                </li>
                <li>
                    <strong>Wishlist content:</strong>
                    lists, titles, descriptions, item details, prices, links,
                    images and fulfilment information that you choose to save.
                </li>
                <li>
                    <strong>Security information:</strong>
                    session information, verification tokens, multi-factor
                    authentication data and passkey information when you enable
                    those features.
                </li>
                <li>
                    <strong>Technical information:</strong>
                    information needed to operate, protect and troubleshoot the
                    service, such as IP address, browser or device information,
                    timestamps and error details.
                </li>
                <li>
                    <strong>Billing and usage information:</strong>
                    where billing is enabled, we process customer and
                    subscription records, plan limits and autofill usage.
                </li>
                <li>
                    <strong>Correspondence:</strong>
                    your email address and the information you provide when you
                    contact us for support or to make a privacy request.
                </li>
            </ul>

            <h2>How we use information</h2>
            <p>We use information to:</p>
            <ul>
                <li>create and operate your account and wishlist;</li>
                <li>
                    send verification, sign-in, recovery and service emails;
                </li>
                <li>
                    provide billing and subscription features where enabled;
                </li>
                <li>
                    protect the service, prevent abuse and investigate security
                    issues;
                </li>
                <li>
                    provide autofill and link-preview features when you request
                    them; and
                </li>
                <li>diagnose errors and improve reliability.</li>
            </ul>
            <h2>Legal bases</h2>
            <p>
                Under the UK GDPR, we use account information and wishlist
                content to perform our contract with you when you create an
                account and use features such as sign-in, wishlists, autofill
                and paid subscriptions. Your name and email are required to
                register an account. You can view a public list without
                registering.
            </p>
            <p>
                We rely on legitimate interests to keep the service secure,
                prevent abuse, diagnose errors and respond to general support
                enquiries. We process information to comply with legal
                obligations where required, such as responding to privacy
                requests or keeping required billing records.
            </p>

            <h2>Service providers</h2>
            <p>
                Cloudflare provides hosting, storage and session infrastructure,
                including operational logging. We use Sentry for error reports
                and a Plunk-compatible email service to deliver messages such as
                verification, sign-in and password reset emails. The email
                service receives the recipient address and message content.
            </p>
            <p>
                When billing is enabled, we may send your name, email address
                and Readyto.gift account ID to Polar to create a billing
                profile, including when you sign up for a free account. Polar
                helps manage subscriptions and may receive autofill usage
                information for metering.
            </p>
            <p>
                Autofill may request information from the product page URL you
                provide, including through Oxylabs as a proxy, and may retrieve
                images from that page. Those websites and providers have their
                own privacy policies.
            </p>

            <h2>Cookies, local storage and error monitoring</h2>
            <p>
                Readyto.gift uses authentication cookies or other session
                storage necessary to sign in and keep the service secure. We
                also use local storage for display preferences, recent list
                history, whether you dismissed the install prompt, and the ID of
                the last account used in the browser. Some preferences and
                recent list history also sync to your signed-in account.
            </p>
            <p>
                We use Sentry to diagnose errors. Reports may include error
                messages, stack traces, and browser or device details.
            </p>

            <h2>Usage analytics</h2>
            <p id="analytics-description">
                We use Umami to understand how people use Readyto.gift and
                improve the service. It measures page views, referral sources
                and browser and device details without analytics cookies. We
                configure it to exclude page URL query strings and fragments.
                You can turn off analytics for this browser below.
            </p>
            <v-switch
                :model-value="analyticsEnabled"
                label="Allow usage analytics"
                aria-describedby="analytics-description"
                color="primary"
                hide-details
                @update:model-value="setAnalyticsPreference"
            />

            <h2>Sharing and international transfers</h2>
            <p>
                Anyone who can access a public wishlist can see its content, the
                list owner's display name, and any contributor or fulfilment
                names associated with it. Private lists are restricted to the
                owner. Uploaded images may still be accessible to someone who
                has their direct URL.
            </p>
            <p>
                We share information with the service providers described above
                and when required by law. Some providers may process information
                outside the UK. Contact us for information about a particular
                transfer and any applicable safeguards.
            </p>

            <h2>Retention and deletion</h2>
            <p>
                We keep your account and wishlist information to provide the
                service. You can delete individual lists and items in the app or
                contact us to request account deletion. Sign-in sessions are
                configured to expire after 30 days and may renew while active.
                Verification tokens have their own expiry times. Billing records
                may be retained to meet legal obligations or resolve disputes.
                The time we need operational logs and error reports depends on
                how long they are useful for investigating incidents or
                resolving faults.
            </p>

            <h2>Your rights</h2>
            <p>
                Depending on where you live, you may have rights to access,
                correct, delete, restrict or object to our use of your personal
                information, receive a copy of it, or withdraw consent. To make
                a request, email
                <a href="mailto:privacy@readyto.gift">privacy@readyto.gift</a>.
                We may need to verify your identity before completing a request.
            </p>
            <p>
                If you are in the UK, you can also complain to the
                <a
                    href="https://ico.org.uk/make-a-complaint/"
                    target="_blank"
                    rel="noreferrer"
                    >Information Commissioner's Office</a
                >.
            </p>

            <h2>Children</h2>
            <p>
                Readyto.gift is a general-audience service and is not intended
                for children under 13. We do not knowingly collect personal
                information from children under 13. If you believe a child has
                provided personal information, contact us so that we can review
                and delete it where appropriate.
            </p>

            <h2>Security</h2>
            <p>
                We use reasonable technical and organisational measures to
                protect information. No internet transmission or electronic
                storage system is completely secure.
            </p>

            <h2>Changes to this policy</h2>
            <p>
                We may update this policy from time to time. The date at the top
                of this page shows when it was last updated. Material changes
                will be communicated through the service or by email where
                appropriate.
            </p>

            <h2>Contact</h2>
            <p>
                For privacy questions or requests, contact
                <a href="mailto:privacy@readyto.gift">privacy@readyto.gift</a>.
            </p>
        </v-card>
    </v-container>
</template>

<script setup>
import { analyticsOptOutKey } from "@/utils/privacy";

const analyticsEnabled = localStorage.getItem(analyticsOptOutKey) !== "true";

const setAnalyticsPreference = (enabled) => {
    if (enabled) localStorage.removeItem(analyticsOptOutKey);
    else localStorage.setItem(analyticsOptOutKey, "true");
    window.location.reload();
};
</script>

<style scoped>
.privacy-page {
    padding-top: 2rem;
    padding-bottom: 3rem;
}

h2 {
    color: rgb(var(--v-theme-primary));
    font-size: 1.35rem;
    line-height: 1.3;
    margin: 2rem 0 0.5rem;
}

p,
ul {
    line-height: 1.65;
}

ul {
    padding-left: 1.5rem;
}

li + li {
    margin-top: 0.4rem;
}

a {
    color: rgb(var(--v-theme-primary));
}
</style>
