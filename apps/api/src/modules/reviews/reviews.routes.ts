import { Router } from 'express';
import { replyToReview } from './reviews.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/require-role.middleware.js';
import { UserRole } from '../../types/index.js';

const router = Router();

// Seller replies to a review on their own product. Ownership of the reviewed
// product is verified inside the controller (seller_offers -> stores.owner_id).
// Review CREATION deliberately lives on the inline route in app.ts
// (POST /api/products/:id/reviews) — it enforces PENDING moderation for
// unverified purchases; this router previously exposed a second, weaker
// create flow (auto-approve) that was never mounted and has been removed.
router.post(
  '/:id/reply',
  requireAuth as any,
  requireRole(UserRole.SELLER, UserRole.ADMIN) as any,
  replyToReview,
);

export default router;
