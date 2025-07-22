import noUnusedStyles from "./rules/no-unused-styles.js";

const plugin = {
  rules: {
    "no-unused-styles": noUnusedStyles,
  },
  configs: {
    recommended: {
      plugins: ["@moox/react-strict-dom"],
      rules: {
        "@moox/react-strict-dom/no-unused-styles": "warn",
      },
    },
  },
};

export default plugin;
