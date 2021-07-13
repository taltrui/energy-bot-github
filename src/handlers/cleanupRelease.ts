import { DateTime } from 'luxon';
import { Context, WebhookPayloadWithRepository } from 'probot';
import { isRelease } from '../utils';

const cleanupRelease = async (context: Context<WebhookPayloadWithRepository>): Promise<void> => {
  const closedPR = context.payload.pull_request;

  if (!isRelease(closedPR?.head.ref) || closedPR?.base.ref !== 'master') {
    return;
  }

  try {
    const prs = await context.octokit.pulls.list(context.repo());

    const changeBasePromises = prs.data.map((pr) => {
      if (pr.base.ref === closedPR.head.ref) {
        return context.octokit.pulls.update(context.repo({ base: 'master', pull_number: pr.number }));
      }

      return new Promise((res) => res(null));
    });

    await Promise.all(changeBasePromises);
  } catch (e) {
    context.log.fatal(
      e,
      `There was an error trying to remove release ${closedPR.head.ref} references in opened pull requests. Aborting.`
    );

    return;
  }

  try {
    context.octokit.git.deleteRef(context.repo({ ref: `heads/${closedPR?.head.ref}` }));
  } catch (e) {
    context.log.warn(
      e,
      `Unable to delete release ${closedPR.head.ref} branch. It is possible to move forward.`
    );
  }

  const formattedDate = DateTime.now().toFormat('dd-mm-yyyy');
  const newReleaseBranch = `release-${formattedDate}`;

  try {
    const newBranchRef = await context.octokit.git.createRef(
      context.repo({ ref: `refs/heads/${newReleaseBranch}`, sha: closedPR?.base.sha })
    );

    const newBranchCommit = await context.octokit.git.getCommit(
      context.repo({ commit_sha: newBranchRef.data.object.sha })
    );

    const newCommit = await context.octokit.git.createCommit(
      context.repo({ message: 'chore: init release', tree: newBranchCommit.data.tree.sha })
    );

    await context.octokit.git.updateRef(
      context.repo({
        ref: `heads/${newReleaseBranch}`,
        sha: newCommit.data.sha,
      })
    );
  } catch (e) {
    context.log.fatal(e, 'There was an error creating the new release branch. Aborting.');
  }

  try {
    context.octokit.pulls.create(
      context.repo({ base: 'master', head: newReleaseBranch, title: `Release ${formattedDate}` })
    );
  } catch (e) {
    context.log.warn(e, "Can't create pull request for new release.");
  }
};

export default cleanupRelease;
