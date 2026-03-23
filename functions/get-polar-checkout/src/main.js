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

        const websiteDomain = "http://localhost:4321";

        const checkout = await polar.checkouts.create({
            embedOrigin: websiteDomain,
            externalCustomerId: user,
            products: [process.env["POLAR_PRO_PRODUCT_ID"] ?? ""],
            successUrl: websiteDomain + "/dash/settings/billing?status=success",
            cancelUrl: websiteDomain + "/dash/settings/billing?status=cancel"
        });

        return res.json({
            success: true,
            checkoutUrl: checkout.url
        });
    } catch (err) {
        error(`Function failed: ${err.message}`);
        return res.json({
            error: "Function failed"
        });
    }
};
