# ESLint Plugin for React Strict DOM

<a href="https://github.com/MoOx/eslint-plugin-react-strict-dom?sponsor=1">
  <img width="140" align="right" alt="Sponsoring button" src="https://github.com/moox/.github/raw/main/FUNDING.svg">
</a>

[![GitHub package.json version](https://img.shields.io/github/package-json/v/MoOx/eslint-plugin-react-strict-dom) ![npm downloads](https://img.shields.io/npm/dm/@moox/eslint-plugin-react-strict-dom)](https://www.npmjs.com/package/@moox/eslint-plugin-react-strict-dom)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/MoOx/eslint-plugin-react-strict-dom/build.yml?branch=main)](https://github.com/MoOx/eslint-plugin-react-strict-dom/actions)
[![License](https://img.shields.io/github/license/MoOx/eslint-plugin-react-strict-dom)](https://github.com/MoOx/eslint-plugin-react-strict-dom)  
![My website moox.io](https://img.shields.io/badge/%F0%9F%8C%8D%20-https%3A%2F%2Fmoox.io-gray?style=social)
[![GitHub followers](https://img.shields.io/github/followers/MoOx?style=social&label=GitHub)](https://github.com/MoOx)
[![LinkedIn Follow](https://img.shields.io/badge/LinkedIn-%20?style=social&logo=invision&logoColor=%230077B5)](https://www.linkedin.com/in/maxthirouin/)
[![BlueSky Follow](https://img.shields.io/badge/BlueSky-%20?style=social&logo=bluesky)](https://bsky.app/profile/moox.io)
[![X Follow](https://img.shields.io/twitter/follow/MoOx?style=social&label=)](https://x.com/MoOx)

> ESLint Plugin for React Strict DOM

## Installation

```bash
npm install --save-dev @moox/eslint-plugin-react-strict-dom
```

## Usage

Add `@moox/eslint-plugin-react-strict-dom` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": [
    "@moox/react-strict-dom"
  ]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "@moox/react-strict-dom/no-unused-styles": "warn"
  }
}
```

## Recommended configuration

This plugin exports a `recommended` configuration that enforces React Strict DOM best practices. To enable this configuration use the `extends` property in your `.eslintrc` config file:

```json
{
  "extends": [
    "plugin:@moox/react-strict-dom/recommended"
  ]
}
```

## Rules

| Rule | Description | Fixable |
|------|-------------|---------|
| [@moox/react-strict-dom/no-unused-styles](docs/rules/no-unused-styles.md) | Detects unused styles created with `css.create` from react-strict-dom | ✅ |


## License

MIT © [Maxime Thirouin](https://moox.io)

