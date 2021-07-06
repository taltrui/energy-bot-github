import { DateTime } from 'luxon';
import { Context, WebhookPayloadWithRepository } from 'probot';
import { isRelease } from '../utils';

const cleanupRelease = async (context: Context<WebhookPayloadWithRepository>): Promise<void> => {
  const closedPR = context.payload.pull_request;

  if (!isRelease(closedPR?.head.ref) || closedPR?.base.ref === 'master') {
    return;
  }

  const prs = await context.octokit.pulls.list(context.repo());

  const changeBasePromises = prs.data.map((pr) => {
    if (pr.base.ref === pr.head.ref) {
      return context.octokit.pulls.update(context.repo({ base: 'master', pull_number: pr.number }));
    }

    return new Promise((res) => res(null));
  });

  await Promise.all(changeBasePromises);

  context.octokit.git.deleteRef(context.repo({ ref: `heads/${closedPR?.head.ref}` }));

  const formattedDate = DateTime.now().toFormat('dd-mm-yyyy');
  const newReleaseBranch = `heads/release-${formattedDate}`;

  const newBranchRef = await context.octokit.git.createRef(
    context.repo({ ref: newReleaseBranch, sha: closedPR?.base.sha })
  );

  await context.octokit.git.createCommit(
    context.repo({ message: 'chore: init release', tree: newBranchRef.data.object.sha })
  );

  context.octokit.pulls.create(
    context.repo({ base: 'master', head: newReleaseBranch, title: `Release ${formattedDate}` })
  );
};

export default cleanupRelease;
