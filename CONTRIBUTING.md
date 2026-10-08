# Contributing to W2M

## Issues

If you find a bug or have a feature request, [open an issue](https://github.com/shensquared/w2m/issues/new).

## Local development

See [Local development](README.md#local-development) in the README for the tools you need and how to run the API and the frontend.

### Checks

Run these before opening a pull request. They match the checks in `.github/workflows`.

| Folder | Command |
| --- | --- |
| `frontend` | `yarn tsc` |
| `frontend` | `yarn lint` |
| `api` | `cargo clippy` |

### Translations

Translation files live in `frontend/src/i18n/locales`. When you add a string, add it to the `en` folder. Other languages fall back to English for strings they do not have.

### Browser extension

The browser extension is an iframe that points to `/create` on the frontend. To test it, set the iframe `src` in `browser-extension/popup.html` to `http://localhost:1234/create`, then load the extension in your browser.

Visiting the URL directly does not work, because `/create` redirects to the home page when it is not running inside an iframe.

## Pull requests

Open pull requests against `main` in [shensquared/w2m](https://github.com/shensquared/w2m). If your pull request fixes an issue, mention it at the top of the description:

```
Closes #123

[describe your PR...]
```
