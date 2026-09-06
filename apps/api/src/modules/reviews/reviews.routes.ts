import { Router } from 'express';
import { createReview, replyToReview } from './reviews.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/', requireAuth as any, createReview);
router.post('/:id/reply', requireAuth as any, replyToReview);

export default router;
