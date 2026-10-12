import * as yup from 'yup';
import { TEXT_LIMITS } from '../constants/limits';

export const CommentKindEnum = ['NOTE', 'FOLLOW_UP', 'INTERVIEW'] as const;

export type CommentKind = (typeof CommentKindEnum)[number];

export const createCommentSchema = yup.object({
  kind: yup
    .mixed<CommentKind>()
    .oneOf([...CommentKindEnum])
    .required('Comment kind is required'),
  bodyHtml: yup
    .string()
    .trim()
    .min(1, 'Comment body cannot be empty')
    .max(TEXT_LIMITS.COMMENT_MAX, `Comment cannot exceed ${TEXT_LIMITS.COMMENT_MAX} characters`)
    .required('Comment body is required'),
  dueAt: yup.date().nullable().optional(),
});

export const updateCommentSchema = yup.object({
  bodyHtml: yup.string().trim().min(1).max(TEXT_LIMITS.COMMENT_MAX).optional(),
  dueAt: yup.date().nullable().optional(),
  done: yup.boolean().optional(),
  version: yup.number().integer().min(0).required('Version is required'),
});

export type CreateCommentInput = yup.InferType<typeof createCommentSchema>;
export type UpdateCommentInput = yup.InferType<typeof updateCommentSchema>;
