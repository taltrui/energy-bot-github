import { ApiResponse } from 'apisauce';
import { Content } from 'jira';

import api from '../config/JiraAPI';

export const addMessage = (content: Content, issueId: string): Promise<ApiResponse<unknown>> =>
  api.post(`/issue/${issueId}/comment`, {
    body: {
      type: 'doc',
      version: 1,
      content,
    },
  });

export const transitionIssue = (transitionId: string, issueId: string): Promise<ApiResponse<unknown>> =>
  api.post(`/issue/${issueId}/transitions`, {
    transition: {
      id: transitionId,
    },
  });

export const createReleasedComment = (version: string, releaseUrl: string): Content => [
  {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'Esta card fue incluida en la versión ',
      },
      {
        type: 'text',
        text: version,
        marks: [
          {
            type: 'link',
            attrs: {
              href: releaseUrl,
            },
          },
        ],
      },
    ],
  },
];
