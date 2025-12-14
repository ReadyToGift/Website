import vuetify from "@/plugins/vuetify";

console.log("App initialized with Vuetify");

export default function setup(app) {
    console.log("Setting up Vuetify plugin");
    app.use(vuetify);
}
