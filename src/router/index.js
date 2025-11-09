import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "home",
            redirect: () => {
                return { name: "Lists" };
            }
        },
        {
            path: "/dash/lists",
            name: "Lists",
            component: () => import("@/views/dash/UserLists.vue"),
            meta: {
                requiresAuth: true
            }
        },
        {
            path: "/dash/list/:id",
            name: "dashlist",
            component: () => import("@/views/WishList.vue"),
            meta: {
                requiresAuth: true
            }
        },
        {
            path: "/list/:id",
            name: "list",
            component: () => import("@/views/WishList.vue")
        },
        {
            path: "/dash/login",
            name: "login",
            component: () => import("@/views/dash/LoginPage.vue")
        },
        {
            path: "/dash/register",
            name: "Register",
            component: () => import("@/views/dash/RegisterPage.vue")
        },
        {
            path: "/dash/verify",
            name: "Verify",
            component: () => import("@/views/dash/VerifyPage.vue"),
            meta: {
                requiresAuth: true
            }
        },
        {
            path: "/dash/recovery/start",
            name: "Start Recovery",
            component: () => import("@/views/dash/recovery/StartRecovery.vue")
        },
        {
            path: "/dash/recovery/complete",
            name: "Complete Recovery",
            component: () => import("@/views/dash/recovery/CompleteRecovery.vue")
        },
        {
            path: "/dash/account",  
            name: "Account Settings",
            component: () => import("@/views/dash/AccountSettings.vue"),
            meta: {
                requiresAuth: true
            }
        },
        {
            path: "/dash/upgrade",
            name: "Upgrade",
            component: () => import("@/views/dash/ProUpgrade.vue"),
            meta: {
                requiresAuth: true
            }
        },
        {
            path: "/dash/error",
            name: "error",
            component: () => import("@/views/dash/ErrorPage.vue")
        },
        {
            path: "/:id(.*)*",
            name: "not-found",
            component: () => import("@/views/NotFound.vue")
        }
    ]
});

router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    await authStore.init();
    if (to.meta && to.meta.requiresAuth) {
        if (!authStore.isLoggedIn) {
            next({ name: "login", query: { redirect: encodeURIComponent(to.fullPath) } });
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;
