export default function requireAuth (Astro) {
    const { user } = Astro.locals;
    console.log({ user });
    if (!user || !user.account) {
        console.log("Redirecting to login");
        return Astro.redirect("/dash/login?redirect=" + encodeURIComponent(new URL(Astro.request.url).pathname));
    }
}