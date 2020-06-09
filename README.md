# Automate `needs-reply`

GitHub Action for automating the `needs-reply` workflow, common in repositories that have high issue counts.

When an issue needs more information, comment on it and then add the `needs-reply` label. After a given timeframe and without any new comments, the issue is automatically closed with a message.

## Usage

```yml
on:
  schedule:
    - cron: "0 0 * * *"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Needs Reply
        uses: dwieeb/needs-reply@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

- **`repo-token`** _**(required)**_ _(string)_: The GitHub Personal Action Token used to authorize with the repository.

    Use `${{ secrets.GITHUB_TOKEN }}` to use the token supplied by GitHub Actions by default.
