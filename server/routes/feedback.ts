import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { AppError, asyncRoute } from '../middleware/error.js'

export function feedbackRouter(): Router {
  const router = Router()

  // ── List posts ──────────────────────────────────────────────────────────────
  router.get('/feedback/posts', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')

    const { category, status, sort } = req.query as {
      category?: string; status?: string; sort?: string
    }

    let query = supabaseAdmin
      .from('feedback_posts')
      .select('*')

    if (category) query = query.eq('category', category)
    if (status)   query = query.eq('status', status)

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false })
    }

    const { data: posts, error } = await query
    if (error) throw new AppError(500, error.message)

    // Get user's votes
    const { data: votes } = await supabaseAdmin
      .from('feedback_votes')
      .select('post_id')
      .eq('user_id', userId)

    const votedSet = new Set((votes ?? []).map((v: any) => v.post_id))

    // Get comment counts
    const postIds = (posts ?? []).map((p: any) => p.id)
    let commentCounts: Record<string, number> = {}
    if (postIds.length > 0) {
      const { data: comments } = await supabaseAdmin
        .from('feedback_comments')
        .select('post_id')
        .in('post_id', postIds)

      for (const c of comments ?? []) {
        commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1
      }
    }

    const result = (posts ?? []).map((p: any) => ({
      ...p,
      has_voted: votedSet.has(p.id),
      comment_count: commentCounts[p.id] ?? 0,
    }))

    res.json({ posts: result })
  }))

  // ── Single post with comments ───────────────────────────────────────────────
  router.get('/feedback/posts/:id', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')

    const { data: post, error } = await supabaseAdmin
      .from('feedback_posts')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !post) throw new AppError(404, 'Post not found')

    const { data: comments } = await supabaseAdmin
      .from('feedback_comments')
      .select('*')
      .eq('post_id', req.params.id)
      .order('created_at', { ascending: true })

    const { data: vote } = await supabaseAdmin
      .from('feedback_votes')
      .select('post_id')
      .eq('post_id', req.params.id)
      .eq('user_id', userId)
      .maybeSingle()

    res.json({
      post: { ...post, has_voted: !!vote, comment_count: (comments ?? []).length },
      comments: comments ?? [],
    })
  }))

  // ── Create post ─────────────────────────────────────────────────────────────
  router.post('/feedback/posts', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')

    const { title, body, category } = req.body
    if (!title?.trim()) throw new AppError(400, 'Title is required')

    const validCategories = ['idea', 'bug', 'integration', 'ux']
    const cat = validCategories.includes(category) ? category : 'idea'

    const { data, error } = await supabaseAdmin
      .from('feedback_posts')
      .insert({ user_id: userId, title: title.trim(), body: body?.trim() || null, category: cat })
      .select()
      .single()

    if (error) throw new AppError(500, error.message)
    res.json({ post: data })
  }))

  // ── Toggle vote ─────────────────────────────────────────────────────────────
  router.post('/feedback/posts/:id/vote', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')

    const postId = req.params.id

    // Check if already voted
    const { data: existing } = await supabaseAdmin
      .from('feedback_votes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      // Unvote
      await supabaseAdmin
        .from('feedback_votes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      // Decrement vote count
      const { data: post } = await supabaseAdmin
        .from('feedback_posts')
        .select('vote_count')
        .eq('id', postId)
        .single()

      if (post) {
        await supabaseAdmin
          .from('feedback_posts')
          .update({ vote_count: Math.max(0, post.vote_count - 1) })
          .eq('id', postId)
      }

      res.json({ voted: false })
    } else {
      // Vote
      const { error } = await supabaseAdmin
        .from('feedback_votes')
        .insert({ post_id: postId, user_id: userId })

      if (error) throw new AppError(500, error.message)

      // Increment vote count
      const { data: post } = await supabaseAdmin
        .from('feedback_posts')
        .select('vote_count')
        .eq('id', postId)
        .single()

      if (post) {
        await supabaseAdmin
          .from('feedback_posts')
          .update({ vote_count: post.vote_count + 1 })
          .eq('id', postId)
      }

      res.json({ voted: true })
    }
  }))

  // ── Add comment ─────────────────────────────────────────────────────────────
  router.post('/feedback/posts/:id/comments', asyncRoute(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError(401, 'Not authenticated')

    const { body } = req.body
    if (!body?.trim()) throw new AppError(400, 'Comment body is required')

    const { data, error } = await supabaseAdmin
      .from('feedback_comments')
      .insert({ post_id: req.params.id, user_id: userId, body: body.trim() })
      .select()
      .single()

    if (error) throw new AppError(500, error.message)
    res.json({ comment: data })
  }))

  return router
}
