import { Router } from 'express';
import { askQuestion, answerQuestion } from './questions.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/', requireAuth as any, askQuestion);
router.post('/:id/answer', requireAuth as any, answerQuestion);

export default router;
