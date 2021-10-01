import { Context, WebhookPayloadWithRepository } from 'probot';

import { getIssueId, getReleaseVersionFromComment } from '../utils/github';
import { addMessage, createReleasedComment } from '../utils/jira';

const notifyReleased = async (context: Context<WebhookPayloadWithRepository>): Promise<void> => {
  const pr = context.payload.issue;
  const repo = context.payload.repository;
  const comment = context.payload.comment.body;

  if (!pr || !repo) {
    return;
  }

  if (pr.state !== 'closed') {
    return;
  }

  const releaseVersion = getReleaseVersionFromComment(comment);

  if (!releaseVersion) {
    return;
  }

  const prId = pr.number;

  try {
    const prInfo = await context.octokit.pulls.get({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: prId,
    });

    const release = await context.octokit.repos.getReleaseByTag({
      owner: repo.owner.login,
      repo: repo.name,
      tag: releaseVersion,
    });

    const issueId = getIssueId(prInfo.data.head.ref);

    if (issueId) {
      await addMessage(createReleasedComment(releaseVersion, release.data.html_url), issueId.toUpperCase());
    }
  } catch (e) {
    context.log.warn(
      e as Record<string, unknown>,
      `There was an error when trying to make a comment in Jira for PR: ${prId}.`
    );
  }
};

export default notifyReleased;
