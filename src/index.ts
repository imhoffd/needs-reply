import * as core from '@actions/core';

const run = async (): Promise<void> => {
  const repoToken = core.getInput('repo-token', { required: true });

  console.log(`Token: ${repoToken}`);
};

run();
