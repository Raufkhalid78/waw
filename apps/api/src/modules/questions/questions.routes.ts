import { Router } from 'express';
import { askQuestion, answerQuestion } from './questions.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { supabaseAdmin } from '../../config/supabase.js';

const router = Router();

// List questions for a product (public)
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('product_questions')
      .select('id, question, answer, created_at, answered_at, profiles!product_questions_user_id_fkey(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const questions = (data || []).map(q => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      author: (q.profiles as any)?.full_name || 'Anonymous',
    }));
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a question (auth required)
router.post('/', requireAuth as any, askQuestion);

// Answer a question (seller only)
router.post('/:id/answer', requireAuth as any, answerQuestion);

export default router;
