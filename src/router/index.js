import { createRouter, createWebHistory } from "vue-router";
import { ENABLE_BILLING } from "astro:env/client";
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
                component: () => import("@/pages/_list/_views/WishList.vue")
            },
            {
                path: "/dash/login",
                component: () => import("@/pages/dash/_views/LoginPage.vue"),
                meta: { requiresAuth: false }
            },
            {
                path: "/dash/register",
                component: () => import("@/pages/dash/_views/RegisterPage.vue"),
                meta: { requiresAuth: false }
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
                path: "/dash/about",
                component: () => import("@/pages/dash/_views/SettingsPage.vue")
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
                component: () => import("@/pages/404/_NotFound.vue")
            },
            {
                path: "/dash/lists",
                component: () => import("@/pages/dash/_views/UserLists.vue"),
                meta: { requiresAuth: true }
            },
            ENABLE_BILLING && {
                path: "/dash/settings/billing",
                component: () => import("@/pages/dash/_views/SettingsPage.vue"),
                meta: { requiresAuth: true }
            }
        ].filter(Boolean)
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
        } else if (to.meta && to.meta.requiresAuth === false) {
            if (currentUser) {
                return next("/dash/lists");
            }
        }
        next();
    });
}

export { clientRouter };
