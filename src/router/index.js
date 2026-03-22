import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser } from "@/stores/auth";

let clientRouter;

if (!import.meta.env.SSR) {
    clientRouter = createRouter({
        history: createWebHistory(import.meta.env.BASE_URL || "/"),
        routes: [
            {
                path: "/",
                redirect: "/dash/lists"
            },
            {
                path: "/list/:listId",
                component: () => import("@/pages/list/_views/WishList.vue")
            },
            {
                path: "/dash/about",
                component: () => import("@/pages/dash/_views/AboutPage.vue")
            },
            {
                path: "/dash/login",
                component: () => import("@/pages/dash/_views/LoginPage.vue")
            },
            {
                path: "/dash/register",
                component: () => import("@/pages/dash/_views/RegisterPage.vue")
            },
            {
                path: "/dash/settings",
                redirect: "/dash/settings/account",
                meta: { requiresAuth: true }
            },
            {
                path: "/dash/settings/account",
                component: () => import("@/pages/dash/_views/SettingsPage.vue"),
                meta: { requiresAuth: true }
            },
            {
                path: "/dash/settings/billing",
                component: () => import("@/pages/dash/_views/SettingsPage.vue"),
                meta: { requiresAuth: true }
            },
            {
                path: "/dash/recovery/start",
                component: () => import("@/pages/dash/_views/recovery/StartRecovery.vue")
            },
            {
                path: "/dash/recovery/complete",
                component: () => import("@/pages/dash/_views/recovery/CompleteRecovery.vue")
            },
            {
                path: "/dash/verify",
                component: () => import("@/pages/dash/_views/VerifyPage.vue")
            },
            {
                path: "/:pathMatch(.*)",
                component: () => import("@/pages/dash/_views/NotFound.vue")
            },
            {
                path: "/dash/lists",
                component: () => import("@/pages/dash/_views/UserLists.vue"),
                meta: { requiresAuth: true }
            }
        ]
    });

    clientRouter.beforeEach(async (to, from, next) => {
        const currentUser = await getCurrentUser();
        if (to.meta && to.meta.requiresAuth) {
            if (!currentUser) {
                return next({
                    path: "/dash/login",
                    query: { redirect: encodeURIComponent(to.fullPath) }
                });
            }
        }
        next();
    });
}

export { clientRouter };
