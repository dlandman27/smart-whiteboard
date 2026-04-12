import { useState, useEffect, useCallback } from 'react'
import { Icon, Text, ScrollArea, Button } from '@whiteboard/ui-kit'
import { apiFetch } from '../lib/apiFetch'

// ── Types ────────────────────────────────────────────────────────────────────

interface FeedbackPost {
  id: string
  title: string
  body: string | null
  category: string
  status: string
  vote_count: number
  has_voted: boolean
  comment_count: number
  created_at: string
}

interface FeedbackComment {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
}

type Category = 'all' | 'idea' | 'bug' | 'integration' | 'ux'
type SortMode = 'votes' | 'newest'

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const CATEGORY_LABELS: Record<string, string> = {
  idea: 'Idea',
  bug: 'Bug',
  integration: 'Integration',
  ux: 'UX',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  idea:        { bg: 'color-mix(in srgb, var(--wt-accent) 15%, transparent)', text: 'var(--wt-accent)' },
  bug:         { bg: 'color-mix(in srgb, var(--wt-danger) 15%, transparent)', text: 'var(--wt-danger)' },
  integration: { bg: 'color-mix(in srgb, #a78bfa 15%, transparent)',          text: '#a78bfa' },
  ux:          { bg: 'color-mix(in srgb, #f59e0b 15%, transparent)',          text: '#f59e0b' },
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  planned:       { bg: 'color-mix(in srgb, #60a5fa 15%, transparent)', text: '#60a5fa', label: 'Planned' },
  'in-progress': { bg: 'color-mix(in srgb, #fbbf24 15%, transparent)', text: '#fbbf24', label: 'In Progress' },
  shipped:       { bg: 'color-mix(in srgb, var(--wt-success) 15%, transparent)', text: 'var(--wt-success)', label: 'Shipped' },
  declined:      { bg: 'color-mix(in srgb, var(--wt-text-muted) 15%, transparent)', text: 'var(--wt-text-muted)', label: 'Declined' },
}

// ── Category pill ────────────────────────────────────────────────────────────

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        background: active ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
        color: active ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ── Upvote button ────────────────────────────────────────────────────────────

function UpvoteButton({ count, voted, onClick }: { count: number; voted: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        width: 48,
        minHeight: 56,
        borderRadius: 10,
        border: `1px solid ${voted ? 'var(--wt-accent)' : 'var(--wt-border)'}`,
        background: voted ? 'color-mix(in srgb, var(--wt-accent) 12%, transparent)' : 'var(--wt-surface)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      <Icon
        icon="CaretUp"
        size={16}
        weight={voted ? 'fill' : 'bold'}
        style={{ color: voted ? 'var(--wt-accent)' : 'var(--wt-text-muted)' }}
      />
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: voted ? 'var(--wt-accent)' : 'var(--wt-text)',
        lineHeight: 1,
      }}>
        {count}
      </span>
    </button>
  )
}

// ── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post, onVote, onClick,
}: {
  post: FeedbackPost
  onVote: () => void
  onClick: () => void
}) {
  const catColor = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.idea
  const statusStyle = STATUS_STYLES[post.status]

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 14,
        padding: '16px 18px',
        background: 'var(--wt-surface)',
        border: '1px solid var(--wt-border)',
        borderRadius: 14,
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--wt-accent) 40%, var(--wt-border))'
        e.currentTarget.style.boxShadow = '0 0 0 1px color-mix(in srgb, var(--wt-accent) 10%, transparent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--wt-border)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Upvote */}
      <UpvoteButton count={post.vote_count} voted={post.has_voted} onClick={onVote} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--wt-text)',
            lineHeight: 1.4,
            flex: 1,
          }}>
            {post.title}
          </span>
          {statusStyle && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: statusStyle.bg,
              color: statusStyle.text,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              {statusStyle.label}
            </span>
          )}
        </div>

        {post.body && (
          <p style={{
            fontSize: 13,
            color: 'var(--wt-text-muted)',
            lineHeight: 1.5,
            margin: '4px 0 8px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {post.body}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 6,
            background: catColor.bg,
            color: catColor.text,
          }}>
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--wt-text-muted)' }}>
            <Icon icon="ChatCircle" size={13} />
            {post.comment_count}
          </span>

          <span style={{ fontSize: 12, color: 'var(--wt-text-muted)', opacity: 0.6 }}>
            {timeAgo(post.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Create post modal ────────────────────────────────────────────────────────

function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<string>('idea')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!title.trim() || submitting) return
    setSubmitting(true)
    try {
      await apiFetch('/api/feedback/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() || null, category }),
      })
      onCreated()
      onClose()
    } catch {
      // error handled by apiFetch
    } finally {
      setSubmitting(false)
    }
  }

  const categories = [
    { id: 'idea', label: 'Idea', icon: 'Lightbulb' },
    { id: 'bug', label: 'Bug', icon: 'Bug' },
    { id: 'integration', label: 'Integration', icon: 'Plugs' },
    { id: 'ux', label: 'UX', icon: 'Layout' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '90vw',
          background: 'var(--wt-bg)',
          border: '1px solid var(--wt-border)',
          borderRadius: 16,
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--wt-border)',
        }}>
          <Text variant="label" size="medium" style={{ fontWeight: 700, color: 'var(--wt-text)' }}>
            Share an idea
          </Text>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--wt-text-muted)', padding: 4,
            }}
          >
            <Icon icon="X" size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-text-muted)', display: 'block', marginBottom: 6 }}>
              Title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short, descriptive title..."
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit() }}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                borderRadius: 10,
                border: '1px solid var(--wt-border)',
                background: 'var(--wt-surface)',
                color: 'var(--wt-text)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-text-muted)', display: 'block', marginBottom: 6 }}>
              Description (optional)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add more details about your idea..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 14,
                borderRadius: 10,
                border: '1px solid var(--wt-border)',
                background: 'var(--wt-surface)',
                color: 'var(--wt-text)',
                outline: 'none',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-text-muted)', display: 'block', marginBottom: 8 }}>
              Category
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {categories.map((cat) => {
                const active = category === cat.id
                const colors = CATEGORY_COLORS[cat.id] ?? CATEGORY_COLORS.idea
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      border: `1px solid ${active ? colors.text : 'var(--wt-border)'}`,
                      background: active ? colors.bg : 'transparent',
                      color: active ? colors.text : 'var(--wt-text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon icon={cat.icon as any} size={14} />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          padding: '12px 20px 16px',
          borderTop: '1px solid var(--wt-border)',
        }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="accent" size="sm" disabled={!title.trim() || submitting} onClick={handleSubmit}>
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Post detail view ─────────────────────────────────────────────────────────

function PostDetailView({
  postId, onBack, onVoteToggle,
}: {
  postId: string
  onBack: () => void
  onVoteToggle: (postId: string) => void
}) {
  const [post, setPost] = useState<FeedbackPost | null>(null)
  const [comments, setComments] = useState<FeedbackComment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchPost = useCallback(async () => {
    try {
      const data = await apiFetch<{ post: FeedbackPost; comments: FeedbackComment[] }>(
        `/api/feedback/posts/${postId}`
      )
      setPost(data.post)
      setComments(data.comments)
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => { fetchPost() }, [fetchPost])

  async function handleVote() {
    if (!post) return
    // Optimistic
    setPost({ ...post, has_voted: !post.has_voted, vote_count: post.has_voted ? post.vote_count - 1 : post.vote_count + 1 })
    onVoteToggle(postId)
    try {
      await apiFetch(`/api/feedback/posts/${postId}/vote`, { method: 'POST' })
    } catch {
      fetchPost() // revert on error
    }
  }

  async function handleComment() {
    if (!commentBody.trim() || submitting) return
    setSubmitting(true)
    try {
      const data = await apiFetch<{ comment: FeedbackComment }>(`/api/feedback/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() }),
      })
      setComments([...comments, data.comment])
      setCommentBody('')
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 })
    } catch {
      // handled
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--wt-text-muted)' }}>
        Loading...
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--wt-text-muted)' }}>
        Post not found
      </div>
    )
  }

  const catColor = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.idea
  const statusStyle = STATUS_STYLES[post.status]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 48px' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--wt-text-muted)',
          fontSize: 13,
          fontWeight: 500,
          padding: '4px 0',
          marginBottom: 20,
        }}
      >
        <Icon icon="ArrowLeft" size={14} />
        Back to feedback
      </button>

      {/* Post header */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <UpvoteButton count={post.vote_count} voted={post.has_voted} onClick={handleVote} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--wt-text)', margin: 0, lineHeight: 1.3 }}>
              {post.title}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: catColor.bg,
              color: catColor.text,
            }}>
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
            {statusStyle && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 6,
                background: statusStyle.bg,
                color: statusStyle.text,
              }}>
                {statusStyle.label}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--wt-text-muted)', opacity: 0.6 }}>
              {timeAgo(post.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      {post.body && (
        <div style={{
          padding: '16px 20px',
          background: 'var(--wt-surface)',
          border: '1px solid var(--wt-border)',
          borderRadius: 12,
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 14, color: 'var(--wt-text)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
            {post.body}
          </p>
        </div>
      )}

      {/* Comments */}
      <div style={{ marginBottom: 16 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--wt-text-muted)',
          opacity: 0.5,
        }}>
          Comments ({comments.length})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {comments.length === 0 && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--wt-text-muted)',
            fontSize: 13,
            opacity: 0.6,
          }}>
            No comments yet. Be the first to share your thoughts.
          </div>
        )}

        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              padding: '14px 16px',
              background: 'var(--wt-surface)',
              borderBottom: '1px solid var(--wt-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--wt-accent) 20%, transparent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon icon="User" size={12} style={{ color: 'var(--wt-accent)' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--wt-text)' }}>User</span>
              <span style={{ fontSize: 11, color: 'var(--wt-text-muted)', opacity: 0.5 }}>
                {timeAgo(c.created_at)}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--wt-text)', lineHeight: 1.6, margin: 0, paddingLeft: 30, whiteSpace: 'pre-wrap' }}>
              {c.body}
            </p>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div style={{
        marginTop: 16,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
      }}>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment()
          }}
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 13,
            borderRadius: 10,
            border: '1px solid var(--wt-border)',
            background: 'var(--wt-surface)',
            color: 'var(--wt-text)',
            outline: 'none',
            resize: 'none',
            lineHeight: 1.5,
          }}
        />
        <Button
          variant="accent"
          size="sm"
          disabled={!commentBody.trim() || submitting}
          onClick={handleComment}
        >
          {submitting ? '...' : 'Reply'}
        </Button>
      </div>
    </div>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export function FeedbackBoardView() {
  const [posts, setPosts] = useState<FeedbackPost[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category>('all')
  const [sort, setSort] = useState<SortMode>('votes')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      params.set('sort', sort)
      const qs = params.toString()
      const data = await apiFetch<{ posts: FeedbackPost[] }>(`/api/feedback/posts${qs ? `?${qs}` : ''}`)
      setPosts(data.posts)
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }, [category, sort])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleVote(postId: string) {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p
        return {
          ...p,
          has_voted: !p.has_voted,
          vote_count: p.has_voted ? p.vote_count - 1 : p.vote_count + 1,
        }
      })
    )

    try {
      await apiFetch(`/api/feedback/posts/${postId}/vote`, { method: 'POST' })
    } catch {
      // Revert on error
      fetchPosts()
    }
  }

  // If a post is selected, show detail view
  if (selectedPostId) {
    return (
      <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--wt-bg)' }}>
        <ScrollArea className="wt-scroll" style={{ flex: 1 }}>
          <PostDetailView
            postId={selectedPostId}
            onBack={() => setSelectedPostId(null)}
            onVoteToggle={handleVote}
          />
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--wt-bg)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6" style={{ paddingTop: 28, paddingBottom: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Text variant="heading" size="medium" style={{ fontWeight: 700, color: 'var(--wt-text)', fontSize: 22 }}>
                Feedback
              </Text>
              <Text variant="body" size="medium" color="muted" style={{ marginTop: 4 }}>
                Share ideas, report bugs, and vote on what matters to you.
              </Text>
            </div>
            <Button variant="accent" size="sm" onClick={() => setShowCreate(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon icon="Plus" size={14} />
                Share an idea
              </span>
            </Button>
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingBottom: 4,
          }}>
            {/* Category pills */}
            <div style={{ display: 'flex', gap: 2 }}>
              <CategoryPill label="All"          active={category === 'all'}         onClick={() => setCategory('all')} />
              <CategoryPill label="Ideas"        active={category === 'idea'}        onClick={() => setCategory('idea')} />
              <CategoryPill label="Bugs"         active={category === 'bug'}         onClick={() => setCategory('bug')} />
              <CategoryPill label="Integrations" active={category === 'integration'} onClick={() => setCategory('integration')} />
              <CategoryPill label="UX"           active={category === 'ux'}          onClick={() => setCategory('ux')} />
            </div>

            {/* Sort toggle */}
            <div style={{
              display: 'flex',
              background: 'var(--wt-surface)',
              border: '1px solid var(--wt-border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setSort('votes')}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: sort === 'votes' ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
                  color: sort === 'votes' ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                Top
              </button>
              <button
                onClick={() => setSort('newest')}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: sort === 'newest' ? 'color-mix(in srgb, var(--wt-accent) 15%, transparent)' : 'transparent',
                  color: sort === 'newest' ? 'var(--wt-accent)' : 'var(--wt-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                Newest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Post list */}
      <ScrollArea className="wt-scroll" style={{ flex: 1 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 24px 48px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 88,
                    borderRadius: 14,
                    background: 'var(--wt-surface)',
                    border: '1px solid var(--wt-border)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    opacity: 0.5,
                  }}
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--wt-text-muted)',
            }}>
              <Icon icon="Megaphone" size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>No feedback yet</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>Be the first to share an idea or report a bug.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onVote={() => handleVote(post.id)}
                  onClick={() => setSelectedPostId(post.id)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create modal */}
      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onCreated={() => fetchPosts()}
        />
      )}
    </div>
  )
}
