import * as core from '@actions/core'
import * as github from '@actions/github'

interface Options {
  readonly action: string
  readonly repoToken: string
  readonly issueLabel: string
  readonly closeMessage: string
  readonly operationsPerRun: number
  readonly daysBeforeClose: number
}

const checkClose = async ({
  repoToken,
  issueLabel,
  closeMessage,
  operationsPerRun,
  daysBeforeClose,
}: Options): Promise<void> => {
  const client = github.getOctokit(repoToken).rest
  let operations = 0

  const getIssues = async (page: number) => {
    try {
      const issues = await client.issues.listForRepo({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        state: 'open',
        labels: issueLabel,
        per_page: 100,
        page,
      })

      operations += 1

      return issues.data
    } catch (e) {
      core.error(new Error('Get issues for repo error', { cause: e }))
      return []
    }
  }

  const processBatch = async (page = 1): Promise<void> => {
    const issues = await getIssues(page)

    if (issues.length === 0) {
      core.info('No more issues found to process. Exiting.')
      return
    }

    for (const issue of issues) {
      const isPr = !!issue.pull_request
      const issueType = isPr ? 'pr' : 'issue'

      core.info(`Found issue: ${issueType} #${issue.number}`)

      if (issue.state === 'closed') {
        core.info(`Skipping ${issueType} #${issue.number} because it is closed`)
        continue
      }

      if (issue.locked) {
        core.info(`Skipping ${issueType} #${issue.number} because it is locked`)
        continue
      }

      if (
        !issue.labels
          .map((l) => (typeof l === 'string' ? l : l.name))
          .includes(issueLabel)
      ) {
        core.info(
          `Skipping ${issueType} #${issue.number} because it does not have the ${issueLabel} label`,
        )
        continue
      }

      let updatedAt = new Date(issue.updated_at).getTime()

      const numComments = issue.comments
      const comments = await client.issues.listComments({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: issue.number,
        per_page: 30,
        page: Math.floor((numComments - 1) / 30) + 1, // the last page
      })
      operations += 1
      const lastComments = comments.data
        .map((l) => new Date(l.created_at).getTime())
        .sort()
      if (lastComments.length > 0) {
        updatedAt = lastComments[lastComments.length - 1]
      }

      const now = new Date().getTime()
      const daysSinceUpdated = (now - updatedAt) / 1000 / 60 / 60 / 24

      if (daysSinceUpdated < daysBeforeClose) {
        core.info(
          `Skipping ${issueType} #${issue.number} because it has been updated in the last ${daysSinceUpdated} days`,
        )
        continue
      }

      if (closeMessage) {
        await client.issues.createComment({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          issue_number: issue.number,
          body: closeMessage,
        })

        operations += 1

        core.info(`Added comment to ${issueType} #${issue.number}`)
      }

      await client.issues.update({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: issue.number,
        state: 'closed',
      })

      await client.issues.removeLabel({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: issue.number,
        name: issueLabel,
      })

      core.info(
        `Closed ${issueType} #${issue.number} and removed ${issueLabel} label because it has not been updated in the last ${daysSinceUpdated} days`,
      )

      operations += 2
    }

    if (operations >= operationsPerRun) {
      core.warning('Reached max number of operations to process. Exiting.')
      return
    }

    await processBatch(page + 1)
  }

  await processBatch()
}

const checkActivity = async ({
  repoToken,
  issueLabel,
}: Options): Promise<void> => {
  if (!github.context.payload.issue) {
    core.error('Could not determine issue number')
    return
  }

  const association = github.context.payload?.comment?.author_association
  // Collaborators will be the ones setting the needs reply label while they comment on why. Avoid
  // removing the label right with their comment.
  if (association == 'OWNER' || association == 'COLLABORATOR') {
    core.info(
      `Not removing label, comment is from ${association.toLowerCase()}`,
    )
    return
  }

  const client = github.getOctokit(repoToken).rest

  let issueNumber =
    github.context.payload.issue?.number ||
    github.context.payload.pull_request?.number

  if (!issueNumber) {
    core.error('Could not determine issue number from event')
    return
  }

  await client.issues.removeLabel({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: issueNumber,
    name: issueLabel,
  })

  core.info(
    `Removed the ${issueLabel} on #${issueNumber} due to comment activity`,
  )
}

const getOptions = (): Options => {
  const action = core.getInput('action')
  const repoToken = core.getInput('repo-token', { required: true })
  const issueLabel = core.getInput('issue-label', { required: true })
  const closeMessage = core.getInput('close-message', { required: true })

  const operationsPerRun = getNumberInput('operations-per-run', {
    required: true,
  })

  const daysBeforeClose = getNumberInput('days-before-close', {
    required: true,
  })

  return {
    action,
    repoToken,
    issueLabel,
    closeMessage,
    operationsPerRun,
    daysBeforeClose,
  }
}

const getNumberInput = (
  input: string,
  options: core.InputOptions = {},
): number => {
  const value = Number.parseInt(core.getInput(input, options), 10)

  if (options.required && Number.isNaN(value)) {
    throw Error(`input ${input} did not parse to a valid integer`)
  }

  return value
}

const run = async (): Promise<void> => {
  try {
    const options = getOptions()
    if (options.action == 'close') {
      await checkClose(options)
    } else {
      await checkActivity(options)
    }
  } catch (e) {
    const error = new Error('Run error', { cause: e })
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
