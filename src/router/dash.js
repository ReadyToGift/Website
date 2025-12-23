import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/dash/lists",
        name: "UserLists",
        component: () => import("../pages/dash/_views/UserLists.vue"),
        props: (route) => ({
            title: route.query.title || null,
            text: route.query.text || null,
            url: route.query.url || null
        })
    },
    {
        path: "/dash/about",
        name: "About",
        component: () => import("../pages/dash/_views/AboutPage.vue")
    },
    {
        path: "/dash/login",
        name: "Login",
        component: () => import("../pages/dash/_views/LoginPage.vue")
    },
    {
        path: "/dash/register",
        name: "Register",
        component: () => import("../pages/dash/_views/RegisterPage.vue")
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
        })
    },
    {
        path: "/dash/recovery/complete",
        name: "CompleteRecovery",
        component: () => import("../pages/dash/_views/recovery/CompleteRecovery.vue"),
        props: (route) => ({
            userId: route.query.userId,
            secret: route.query.secret
        })
    },
    {
        path: "/list/:listId",
        name: "WishList",
        component: () => import("../pages/list/_views/WishList.vue"),
        props: (route) => ({
            listId: route.params.listId,
            quickCreateURLParam: route.query.quickCreateURL
        })
    },
    {
        path: "/dash",
        redirect: "/dash/lists"
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes
});

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
    // Check if route requires auth
    if (to.meta.requiresAuth) {
        // Import user store to check auth status
        import("@/stores/auth").then(({ user }) => {
            if (!user.get()?.account) {
                // Redirect to login with return path
                next({
                    path: "/dash/login",
                    query: { redirect: to.fullPath }
                });
            } else {
                next();
            }
        });
    } else {
        next();
    }
});
