import { DateTime } from 'luxon';
import { Context, WebhookPayloadWithRepository } from 'probot';

import { isRelease } from '../utils/github';

const cleanupRelease = async (context: Context<WebhookPayloadWithRepository>): Promise<void> => {
  const closedPR = context.payload.pull_request;

  const masterBranch = closedPR?.base;

  const mergedReleaseBranch = closedPR?.head;

  let repoHasARelease = false;

  if (!masterBranch || !mergedReleaseBranch) {
    return;
  }

  if (!isRelease(mergedReleaseBranch.ref) || masterBranch.ref !== 'master' || !closedPR?.merged) {
    return;
  }

  try {
    const prs = await context.octokit.pulls.list(context.repo());

    const changeBasePromises = prs.data.map((pr) => {
      if (isRelease(pr.head.ref)) {
        repoHasARelease = true;
      }
      if (pr.base.ref === mergedReleaseBranch.ref) {
        return context.octokit.pulls.update(context.repo({ base: 'master', pull_number: pr.number }));
      }

      return new Promise((res) => res(null));
    });

    await Promise.all(changeBasePromises);
  } catch (e) {
    context.log.fatal(
      e as Record<string, unknown>,
      `There was an error trying to remove release ${mergedReleaseBranch.ref} references in opened pull requests. Aborting.`
    );

    return;
  }

  // We remove the merged release branch. This failing is not fatal, it will only left the branch to be deleted manually.
  try {
    context.octokit.git.deleteRef(context.repo({ ref: `heads/${mergedReleaseBranch.ref}` }));
  } catch (e) {
    context.log.warn(
      e as Record<string, unknown>,
      `Unable to delete release ${mergedReleaseBranch.ref} branch. It is possible to move forward.`
    );
  }

  // If repo already has a release up, we don't create a new one. This cases could be caused when
  // making a hotfix or a cherry-picked release.
  if (repoHasARelease) return;

  const formattedDate = DateTime.now().toFormat('dd-MM-yyyy');
  const newReleaseBranch = `release-${formattedDate}`;

  try {
    // A branch is just a git reference, so we create one in /refs/heads which is where branches are stored.
    // Since we create release branches from master, we use its sha as the base from which this branch is created.
    // Release branches' name contract is: release-dd-mm-yyyy
    const newBranchRef = await context.octokit.git.createRef(
      context.repo({ ref: `refs/heads/${newReleaseBranch}`, sha: masterBranch.sha })
    );

    // Get the last commit of the new branch so we can obtain its tree and sha.
    const newBranchCommit = await context.octokit.git.getCommit(
      context.repo({ commit_sha: newBranchRef.data.object.sha })
    );

    // Create a commit and with the last commit as parent and with its tree as base.
    const newCommit = await context.octokit.git.createCommit(
      context.repo({
        message: 'chore: init release',
        tree: newBranchCommit.data.tree.sha,
        parents: [newBranchCommit.data.sha],
      })
    );

    // Update new branch ref to include new commit.
    await context.octokit.git.updateRef(
      context.repo({
        ref: `heads/${newReleaseBranch}`,
        sha: newCommit.data.sha,
      })
    );
  } catch (e) {
    context.log.fatal(
      e as Record<string, unknown>,
      'There was an error creating the new release branch. Aborting.'
    );
  }

  try {
    context.octokit.pulls.create(
      context.repo({ base: 'master', head: newReleaseBranch, title: `Release ${formattedDate}` })
    );
  } catch (e) {
    context.log.warn(
      e as Record<string, unknown>,
      'There was an error when creating a pull request for the new release.'
    );
  }
};

export default cleanupRelease;
