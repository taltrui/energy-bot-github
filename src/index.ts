import { Probot } from 'probot';
import cleanupRelease from './handlers/cleanupRelease';
import mergeable from './handlers/mergeable';
// import notifyReleased from './handlers/notifyReleased';

export = (app: Probot): void => {
  app.on(
    [
      'pull_request.opened',
      'pull_request.edited',
      'pull_request.labeled',
      'pull_request.unlabeled',
      'pull_request.reopened',
    ],
    mergeable
  );

  app.on('pull_request.closed', cleanupRelease);

  // app.on('pull_request.labeled', notifyReleased);
};
