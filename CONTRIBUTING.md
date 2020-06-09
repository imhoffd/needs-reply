# Contributing

This action is written in TypeScript.

- Source code exists in `src/`
- Run `npm run watch` to watch for changes and recompile
- Output files are placed in `dist/`

## Releasing

Follow these steps to make a new release:

1. Checkout a new release branch

    ```
    git checkout -b releases/v1
    ```

1. Build the codebase and remove dev dependencies from `node_modules/`

    ```
    npm run build
    npm prune --production
    ```

1. Commit `dist/` & `node_modules/`

    ```
    git add -f dist node_modules
    git commit -m "prod commit"
    ```
