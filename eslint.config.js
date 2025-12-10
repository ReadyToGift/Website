import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";

export default [
    { files: ["**/*.{js,mjs,cjs,vue,.ts}"] },
    { languageOptions: { globals: { ...globals.browser, process: "readonly" } } },
    pluginJs.configs.recommended,
    { plugins: { vue: pluginVue } },
    ...pluginVue.configs["flat/essential"],
    {
        ignores: ["node_modules/*", "dist/*", ".git/*"]
    },
    {
        rules: {
            "array-bracket-spacing": ["error", "never"],
            "comma-dangle": ["error", "never"],
            indent: ["error", 4],
            "object-curly-spacing": ["error", "always"],
            quotes: ["error", "double"],
            semi: ["error", "always"],
            "sort-imports": [
                "error",
                {
                    allowSeparatedGroups: true,
                    ignoreCase: true,
                    memberSyntaxSortOrder: ["none", "all", "multiple", "single"]
                }
            ],
            "vue/first-attribute-linebreak": [
                "error",
                {
                    multiline: "below",
                    singleline: "ignore"
                }
            ],
            "vue/html-closing-bracket-newline": [
                "error",
                {
                    multiline: "always",
                    selfClosingTag: {
                        multiline: "always",
                        singleline: "never"
                    },
                    singleline: "never"
                }
            ],
            "vue/html-indent": ["error", 4],
            "vue/html-self-closing": [
                "error",
                {
                    html: {
                        component: "always",
                        normal: "never",
                        void: "always"
                    }
                }
            ],
            "vue/max-attributes-per-line": [
                "error",
                {
                    multiline: {
                        max: 1
                    },
                    singleline: {
                        max: 1
                    }
                }
            ],
            "vue/no-deprecated-slot-attribute": [
                "error",
                {
                    ignore: ["md-icon"]
                }
            ],
            "vue/script-indent": ["error", 4]
        }
    }
];
