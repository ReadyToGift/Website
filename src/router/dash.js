import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser } from "@/stores/auth";

const routes = [
    {
        path: "/",
        redirect: "/dash/lists"
    },
    {
        path: "/dash",
        redirect: "/dash/lists"
    },
    {
        path: "/dash/lists",
        name: "UserLists",
        component: () => import("../pages/dash/_views/UserLists.vue"),
        props: (route) => ({
            title: route.query.title || null,
            text: route.query.text || null,
            url: route.query.url || null
        }),
        meta: { requiresAuth: true }
    },
    {
        path: "/dash/about",
        name: "About",
        component: () => import("../pages/dash/_views/AboutPage.vue")
    },
    {
        path: "/dash/login",
        name: "Login",
        component: () => import("../pages/dash/_views/LoginPage.vue"),
        meta: { guestOnly: true }
    },
    {
        path: "/dash/register",
        name: "Register",
        component: () => import("../pages/dash/_views/RegisterPage.vue"),
        meta: { guestOnly: true }
    },
    {
        path: "/dash/settings",
        name: "Settings",
        component: () => import("../pages/dash/_views/AccountSettings.vue"),
        meta: { requiresAuth: true }
    },
    {
        path: "/dash/verify",
        name: "Verify",
        component: () => import("../pages/dash/_views/VerifyPage.vue"),
        props: (route) => ({
            userId: route.query.userId,
            secret: route.query.secret
        })
    },
    {
        path: "/dash/recovery/start",
        name: "StartRecovery",
        component: () => import("../pages/dash/_views/recovery/StartRecovery.vue"),
        props: (route) => ({
            redirect: route.query.redirect || "/dash/lists"
        }),
        meta: { guestOnly: true }
    },
    {
        path: "/dash/recovery/complete",
        name: "CompleteRecovery",
        component: () => import("../pages/dash/_views/recovery/CompleteRecovery.vue"),
        props: (route) => ({
            userId: route.query.userId,
            secret: route.query.secret
        }),
        meta: { guestOnly: true }
    },
    {
        path: "/list/:listId",
        name: "WishList",
        component: () => import("../pages/list/_views/WishList.vue"),
        props: (route) => ({
            listId: route.params.listId,
            quickCreateURLParam: route.query.quickCreateURL
        })
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach(async (to, from, next) => {
    // Check if route requires auth
    if (to.meta.requiresAuth || to.meta.guestOnly) {
        const currentUser = await getCurrentUser();

        if (to.meta.requiresAuth && !currentUser) {
            return next({
                path: "/dash/login",
                query: { redirect: to.fullPath }
            });
        } else if (to.meta.guestOnly && currentUser) {
            const redirectPath = to.query.redirect;
            return next({ path: redirectPath || "/dash/lists" });
        }
    } 
    next();
});
