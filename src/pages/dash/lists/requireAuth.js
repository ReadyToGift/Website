export default function requireAuth (Astro) {
    const { user } = Astro.locals;
    if (!user || !user.account) {
        Astro.redirect("/dash/login?redirect=" + encodeURIComponent(new URL(Astro.request.url).pathname));
    }
}