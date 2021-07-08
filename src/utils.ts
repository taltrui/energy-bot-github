const WIPandHoldNames = ['wip', 'work in progress', 'hold', 'on hold'];

export const isRelease = (branchName: string): boolean => new RegExp('release-*').test(branchName);

export const isWIPorHold = (labels: Array<{ name: string }>): boolean =>
  labels.some((label) => {
    return WIPandHoldNames.includes(label.name.toLowerCase());
  });
