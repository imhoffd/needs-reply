import * as core from '@actions/core';
import * as github from '@actions/github';

interface Options {
  readonly repoToken: string;
  readonly issueLabel: string;
  readonly operationsPerRun: number;
  readonly daysBeforeClose: number;
}

const processIssues = async ({
  repoToken,
  issueLabel,
  operationsPerRun,
  daysBeforeClose,
}: Options): Promise<void> => {
  const client = github.getOctokit(repoToken);
  let operations = 0;

  const getIssues = async (page: number) => {
    try {
      const issues = await client.issues.listForRepo({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        state: 'open',
        labels: issueLabel,
        per_page: 100,
        page,
      });

      operations += 1;

      return issues.data;
    } catch (e) {
      core.error(`Get issues for repo error: ${e.message}`);
      return [];
    }
  };

  const processBatch = async (page = 1): Promise<void> => {
    const issues = await getIssues(page);

    if (issues.length === 0) {
      core.info('No more issues found to process. Exiting.');
      return;
    }

    for (const issue of issues) {
      const isPr = !!issue.pull_request;
      const issueType = isPr ? 'pr' : 'issue';

      core.info(`Found issue: issue #${issue.number} (type: ${issueType})`);

      if (issue.state === 'closed') {
        core.info(`Skipping ${issueType} because it is closed`);
        continue;
      }

      if (issue.state === 'locked') {
        core.info(`Skipping ${issueType} because it is locked`);
        continue;
      }

      console.log(issue);
    }

    if (operations >= operationsPerRun) {
      core.warning('Reached max number of operations to process. Exiting.');
      return;
    }

    await processBatch(page + 1);
  };

  await processBatch();
};

const getOptions = (): Options => {
  const repoToken = core.getInput('repo-token', { required: true });
  const issueLabel = core.getInput('issue-label', { required: true });
  const operationsPerRun = getNumberInput('operations-per-run', { required: true });
  const daysBeforeClose = getNumberInput('days-before-close', { required: true });

  return {
    repoToken,
    issueLabel,
    operationsPerRun,
    daysBeforeClose,
  };
};

const getNumberInput = (input: string, options: core.InputOptions = {}): number => {
  const value = Number.parseInt(core.getInput(input, options), 10);

  if (options.required && Number.isNaN(value)) {
    throw Error(`input ${input} did not parse to a valid integer`);
  }

  return value;
};

const run = async (): Promise<void> => {
  try {
    const options = getOptions();
    await processIssues(options);
  } catch (e) {
    core.error(e);
    core.setFailed(e.message);
  }
};

run();
