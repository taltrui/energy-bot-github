import { Context, WebhookPayloadWithRepository } from 'probot';

import { isRelease, isWIPorHold } from '../utils/github';

const mergeable = async (context: Context<WebhookPayloadWithRepository>): Promise<void> => {
  const timeStart = new Date().toISOString();
  const pr = context.payload.pull_request;
  context.log.info('dasdsa');
  if (!pr) {
    return;
  }

  let isMergeable = true;

  let isBaseMaster = false;
  let isHeadRelease = false;

  if (pr.base.ref === 'master') {
    isBaseMaster = true;
  }

  if (isRelease(pr.head.ref)) {
    isHeadRelease = true;
  }

  if (isWIPorHold(pr.labels) || (isBaseMaster && !isHeadRelease)) {
    isMergeable = false;
  }

  try {
    await context.octokit.checks.create(
      context.repo({
        name: 'Mergeable',
        head_sha: pr.head.sha,
        status: 'completed',
        started_at: timeStart,
        conclusion: isMergeable ? 'success' : 'failure',
        completed_at: new Date().toISOString(),
        output: {
          title: isMergeable ? 'Pull request can be merged.' : 'Pull request cannot be merged.',
          summary: isMergeable
            ? 'This PR passed the checks for it to be merged.'
            : 'This PR is either in WIP or Hold status or a non release branch has master as its base.',
        },
      })
    );
  } catch (e) {
    context.log.warn(
      e as Record<string, unknown>,
      `There was an error when trying to create the mergeable check for: ${pr.head.ref}.`
    );
  }
};

export default mergeable;
