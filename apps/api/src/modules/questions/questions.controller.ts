import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

export const askQuestion = async (req: Request, res: Response) => {
  try {
    const { productId, question } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!productId || !question) return res.status(400).json({ error: 'Missing required fields.' });

    const { data, error } = await supabaseAdmin
      .from('product_questions')
      .insert({
        product_id: productId,
        user_id: userId,
        question
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const answerQuestion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!answer) return res.status(400).json({ error: 'Answer is required.' });

    // Verify user owns the store
    const { data: store, error: storeError } = await supabaseAdmin
      .from('seller_profiles')
      .select('store_id')
      .eq('id', userId)
      .single();

    if (storeError || !store) return res.status(403).json({ error: 'Unauthorized' });

    // Verify question belongs to seller's product
    const { data: question, error: questionError } = await supabaseAdmin
      .from('product_questions')
      .select('product_id, products!inner(store_id)')
      .eq('id', id)
      .single();

    if (questionError || !question || (question.products as any).store_id !== store.store_id) {
      return res.status(403).json({ error: 'Not authorized to answer this question.' });
    }

    const { data, error } = await supabaseAdmin
      .from('product_questions')
      .update({
        answer,
        answered_by: userId,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
