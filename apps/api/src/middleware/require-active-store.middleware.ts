import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export const requireActiveStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    // Admins bypass the active store check
    if (user.role === 'ADMIN') {
      return next();
    }

    const { data: store, error } = await supabaseAdmin
      .from('stores')
      .select('id, status')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (error || !store) {
      res.status(403).json({ error: 'Forbidden: No store registered for this user' });
      return;
    }

    if (store.status === 'PENDING_KYC') {
      res.status(403).json({ error: 'Forbidden: Store is pending KYC approval. Features are locked.' });
      return;
    }

    if (store.status === 'SUSPENDED' || store.status === 'REJECTED') {
      res.status(403).json({ error: `Forbidden: Store account is ${store.status.toLowerCase()}` });
      return;
    }

    // Attach store to request for convenience in subsequent handlers
    (req as any).store = store;

    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error while verifying store status' });
  }
};
