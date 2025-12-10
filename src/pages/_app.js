import { clientRouter } from "./_clientRouter";
import { createPinia } from "pinia";
import vuetify from "@/plugins/vuetify";

const pinia = createPinia();

export default function setup(app) {
    app.use(pinia);
    app.use(vuetify);
    if (clientRouter) {
        app.use(clientRouter);
    }
}
