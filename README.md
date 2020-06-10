# Automate `needs-reply`

When an issue needs more information, comment on it and then add the `needs-reply` label. After a given timeframe and without any new comments, the issue is automatically closed with a message.

## Usage

First, create a workflow (`.github/workflows/needs-reply-remove.yml`, for example) that removes the `needs-reply` label whenever comments are made:

```yml
name: Remove needs-reply label

on:
  issue_comment:
    types:
      - created

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Remove needs-reply label
        uses: octokit/request-action@v2.x
        continue-on-error: true
        with:
          route: DELETE /repos/:repository/issues/:issue/labels/:label
          repository: ${{ github.repository }}
          issue: ${{ github.event.issue.number }}
          label: needs-reply
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Then, create a workflow (`.github/workflows/needs-reply.yml`, for example) that closes old issues that have the `needs-reply` label and have not been replied to in 30 days:

```yml
name: Close old issues that need reply

on:
  schedule:
    - cron: "0 0 * * *"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Close old issues that need reply
        uses: dwieeb/needs-reply@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          issue-label: needs-reply
```

## Inputs

- **`repo-token`** _**(required)**_ _(string)_: The GitHub Personal Action Token used to authorize with the repository.

    Use `${{ secrets.GITHUB_TOKEN }}` to use the token supplied by GitHub Actions by default.

- **`issue-label`** _(string)_: The label to look for when closing issues. Defaults to `needs-reply`.
- **`days-before-close`** _(number)_: The number of days to wait to close an issue after the label has been added. Defaults to `30`.
- **`close-message`** _(string)_: The comment to post when the issue is closed. To disable, pass in an empty string. Defaults to the following:

    > It looks like there hasn't been a reply in 30 days, so I'm closing this issue.

- **`operations-per-run`** _(number)_: The maximum number of operations per run, used to control rate limiting. Defaults to `30`.
