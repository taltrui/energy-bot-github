const WIPandHoldNames = ['wip', 'work in progress', 'hold', 'on hold'];

export const isRelease = (branchName: string): boolean =>
  new RegExp(/release-\d{2}-\d{2}-\d{4}/gm).test(branchName);

export const isWIPorHold = (labels: Array<{ name: string }>): boolean =>
  labels.some((label) => {
    return WIPandHoldNames.includes(label.name.toLowerCase());
  });
