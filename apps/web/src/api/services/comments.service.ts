import { httpClient } from '../client/http-client';
import { APPLICATION_ENDPOINTS } from '../endpoints/applications.endpoints';
import { COMMENT_ENDPOINTS } from '../endpoints/comments.endpoints';
import {
  CommentDto,
  ActivityDto,
  CreateCommentInput,
  UpdateCommentInput,
  ApiSuccess,
  PageInfo,
} from '@hiretrail/shared';

export const commentsService = {
  async listForApplication(applicationId: string): Promise<CommentDto[]> {
    const res = await httpClient.get<ApiSuccess<CommentDto[]>>(
      APPLICATION_ENDPOINTS.comments(applicationId),
    );
    return res.data.data;
  },

  async create(applicationId: string, input: CreateCommentInput): Promise<CommentDto> {
    const res = await httpClient.post<ApiSuccess<CommentDto>>(
      APPLICATION_ENDPOINTS.comments(applicationId),
      input,
    );
    return res.data.data;
  },

  async update(id: string, input: UpdateCommentInput): Promise<CommentDto> {
    const res = await httpClient.patch<ApiSuccess<CommentDto>>(COMMENT_ENDPOINTS.byId(id), input);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(COMMENT_ENDPOINTS.byId(id));
  },

  async listActivities(
    applicationId: string,
    type?: 'history' | 'all',
    cursor?: string,
    limit?: number,
  ): Promise<{ items: ActivityDto[]; page: PageInfo }> {
    const res = await httpClient.get<ApiSuccess<{ items: ActivityDto[]; page: PageInfo }>>(
      APPLICATION_ENDPOINTS.activities(applicationId),
      { params: { type, cursor, limit } },
    );
    return res.data.data;
  },
};
