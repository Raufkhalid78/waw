import { Request, Response } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

export const createReview = async (req: Request, res: Response) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!productId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid product or rating.' });
    }

    // Call the function we created in 029_reviews_and_qa.sql
    const { data: isVerified, error: verifiedError } = await supabaseAdmin
      .rpc('is_verified_purchase', { p_user_id: userId, p_product_id: productId });

    if (verifiedError) {
      return res.status(500).json({ error: 'Error verifying purchase status.' });
    }

    // Note: Business rule requires VERIFIED_PURCHASE for all reviews in WAW to prevent fake reviews
    if (!isVerified) {
      return res.status(403).json({ error: 'You can only review products you have purchased and received.' });
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        product_id: productId,
        buyer_id: userId,
        rating,
        comment,
        is_verified_purchase: true,
        status: 'APPROVED', // Auto approve for now, or PENDING if moderation needed
        is_approved: true
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const replyToReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Review ID
    const { sellerReply } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!sellerReply) return res.status(400).json({ error: 'Reply content is required.' });

    // Verify the seller owns the product that was reviewed.
    // reviews.product_id references catalog_products (which has no store_id);
    // ownership is proven via seller_offers on that catalog product.
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('product_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) return res.status(404).json({ error: 'Review not found.' });

    const { data: owningOffer, error: offerError } = await supabaseAdmin
      .from('seller_offers')
      .select('id, store:stores(id, owner_id)')
      .eq('catalog_product_id', review.product_id)
      .limit(1)
      .maybeSingle();

    if (offerError || !owningOffer || (owningOffer.store as any)?.owner_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to reply to this review.' });
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({
        seller_reply: sellerReply,
        seller_reply_at: new Date().toISOString()
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
