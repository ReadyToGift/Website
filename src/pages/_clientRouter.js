// https://flori.dev/reads/astro-vue-router/

import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

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
                component: () => import("@/pages/_views/WishList.vue")
            },
            {
                path: "/dash/login",
                component: () => import("@/pages/_views/dash/LoginPage.vue")
            },
            {
                path: "/dash/register",
                component: () => import("@/pages/_views/dash/RegisterPage.vue")
            },
            {
                path: "/dash/settings",
                redirect: "/dash/settings/account",
                meta: { requiresAuth: true }
            },
            {
                path: "/dash/settings/account",
                component: () => import("@/pages/_views/dash/settings/SettingsPage.vue"),
                meta: { requiresAuth: true }
            },
            {
                path: "/dash/settings/billing",
                component: () => import("@/pages/_views/dash/settings/SettingsPage.vue"),
                meta: { requiresAuth: true }
            },
            {
                path: "/dash/recovery/start",
                component: () => import("@/pages/_views/dash/recovery/StartRecovery.vue")
            },
            {
                path: "/dash/recovery/complete",
                component: () => import("@/pages/_views/dash/recovery/CompleteRecovery.vue")
            },
            {
                path: "/dash/verify",
                component: () => import("@/pages/_views/dash/VerifyPage.vue")
            },
            {
                path: "/:pathMatch(.*)",
                component: () => import("@/pages/_views/NotFound.vue")
            },
            {
                path: "/dash/lists",
                component: () => import("@/pages/_views/dash/UserLists.vue"),
                meta: { requiresAuth: true }
            }
        ]
    });

    clientRouter.beforeEach(async (to, from, next) => {
        const authStore = useAuthStore();
        await authStore.init();
        if (to.meta && to.meta.requiresAuth) {
            if (!authStore.isLoggedIn) {
                return next({
                    path: "/dash/login",
                    query: { redirect: encodeURIComponent(to.fullPath) }
                });
            }
        };
        next();
    });
}

export { clientRouter };