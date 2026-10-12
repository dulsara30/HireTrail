import React, { useState } from 'react';
import { ActivityDto, CommentDto } from '@hiretrail/shared';
import { commentsService } from '../../../api/services/comments.service';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';

interface ActivityFeedProps {
  applicationId: string;
  activities: ActivityDto[];
  comments: CommentDto[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onCommentAdded: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  applicationId,
  activities,
  comments,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onCommentAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'history'>('all');
  const [commentText, setCommentText] = useState('');
  const [commentKind, setCommentKind] = useState<'NOTE' | 'FOLLOW_UP' | 'INTERVIEW'>('NOTE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
  });

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentsService.create(applicationId, {
        kind: commentKind,
        bodyHtml: `<p>${commentText}</p>`,
      });
      setCommentText('');
      onCommentAdded();
    } catch {
      // Ignored: silent fail
    } finally {
      setIsSubmitting(false);
    }
  };

  const combinedItems = React.useMemo(() => {
    if (activeTab === 'comments') {
      return comments.map((c) => ({
        id: c.id,
        type: 'COMMENT' as const,
        date: new Date(c.createdAt),
        title:
          c.kind === 'FOLLOW_UP'
            ? 'Follow-up task'
            : c.kind === 'INTERVIEW'
              ? 'Interview note'
              : 'Note',
        body: c.bodyHtml.replace(/<[^>]*>/g, ''),
      }));
    }

    if (activeTab === 'history') {
      return activities.map((a) => ({
        id: a.id,
        type: 'ACTIVITY' as const,
        date: new Date(a.createdAt),
        title: a.summary,
        body: undefined,
      }));
    }

    // 'all'
    const list: Array<{
      id: string;
      type: 'COMMENT' | 'ACTIVITY';
      date: Date;
      title: string;
      body?: string;
    }> = [];
    for (const c of comments) {
      list.push({
        id: c.id,
        type: 'COMMENT',
        date: new Date(c.createdAt),
        title:
          c.kind === 'FOLLOW_UP'
            ? 'Follow-up task'
            : c.kind === 'INTERVIEW'
              ? 'Interview note'
              : 'Note',
        body: c.bodyHtml.replace(/<[^>]*>/g, ''),
      });
    }
    for (const a of activities) {
      list.push({
        id: a.id,
        type: 'ACTIVITY',
        date: new Date(a.createdAt),
        title: a.summary,
      });
    }
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [activeTab, comments, activities]);

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Activity</h3>
        <div className="flex items-center gap-1 bg-bg-subtle p-0.5 rounded-md border border-border">
          {(['all', 'comments', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${
                activeTab === tab ? 'bg-bg text-text shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Add comment form */}
      <form
        onSubmit={handleAddComment}
        className="flex flex-col gap-2 rounded-md border border-border bg-bg p-3"
      >
        <div className="flex items-center gap-2">
          <select
            value={commentKind}
            onChange={(e) => setCommentKind(e.target.value as 'NOTE' | 'FOLLOW_UP' | 'INTERVIEW')}
            className="text-xs font-medium bg-bg-subtle border border-border rounded px-2 py-1 text-text focus:outline-none"
          >
            <option value="NOTE">Note</option>
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="INTERVIEW">Interview</option>
          </select>
        </div>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a note or update…"
          rows={2}
          className="w-full text-sm bg-transparent border-0 focus:outline-none resize-none placeholder:text-text-muted"
        />
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={isSubmitting || !commentText.trim()}
          >
            {isSubmitting ? <Spinner size="sm" /> : 'Comment'}
          </Button>
        </div>
      </form>

      {/* Feed listing */}
      <div className="space-y-3">
        {combinedItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-1 text-xs border-l-2 border-border pl-3 py-1"
          >
            <div className="flex items-center justify-between text-text-muted">
              <span className="font-medium text-text">{item.title}</span>
              <span>
                {item.date.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {item.body && <p className="text-text mt-0.5">{item.body}</p>}
          </div>
        ))}

        {combinedItems.length === 0 && !isLoading && (
          <p className="text-xs text-text-muted italic text-center py-4">No activity yet</p>
        )}

        <div ref={sentinelRef} className="py-2 flex justify-center">
          {isFetchingNextPage && <Spinner size="sm" />}
        </div>
      </div>
    </div>
  );
};
