const WIPandHoldNames = ['wip', 'work in progress', 'hold', 'on hold'];

export const isRelease = (branchName: string): boolean =>
  new RegExp(/release-\d{2}-\d{2}-\d{4}/gm).test(branchName);

export const isWIPorHold = (labels: Array<{ name: string }>): boolean =>
  labels.some((label) => {
    return WIPandHoldNames.includes(label.name.toLowerCase());
  });

export const isReleased = (labels: Array<{ name: string }>): boolean =>
  labels.some((label) => {
    return label.name.toLowerCase() === 'released';
  });

export const getReleaseVersionFromComment = (comment: string): string | undefined => {
  const regex = /([a-zA-Z-]+@\d+.\d+.\d+)|(\d+.\d+.\d+)/gi;
  const versions = comment.match(regex);

  console.log(versions);

  if (!versions) {
    return;
  }

  if (versions.length === 1) {
    return versions[0];
  }

  if (versions.length > 1) {
    return versions[1].includes('@') ? versions[1] : versions[0];
  }

  return;
};

export const getIssueId = (branch: string): string | undefined => {
  const regex = /([a-zA-Z]+-[\d]+)/gi;

  return branch.match(regex)?.[0];
};
