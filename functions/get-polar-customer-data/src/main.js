import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
    accessToken: process.env["POLAR_ACCESS_TOKEN"] ?? ""
});

export default async ({ req, res, error }) => {
    try {
        const user = req.headers["x-appwrite-user-id"];

        if (!user) {
            return res.json({
                error: "No user ID provided"
            });
        }

        const subscriptionsResponse = await polar.subscriptions.list({
            externalCustomerId: user
        });

        const hasFreeSubscription = subscriptionsResponse.result.items.some((sub) => sub.product.name === "Free Membership");
        const hasProSubscription = subscriptionsResponse.result.items.some((sub) => sub.product.name === "Pro Membership");

        const meters = await polar.customerMeters.list({
            externalCustomerId: user
        }, {});

        const publicListMeter = meters.result.items.find((meter) => meter.meter.name === "Public Lists") || {};

        return res.json({
            success: true,
            hasFreeSubscription,
            hasProSubscription,
            publicListMeter
        });
    } catch (err) {
        error(`Function failed: ${err.message}`);
        return res.json({
            error: "Function failed"
        });
    }
};
