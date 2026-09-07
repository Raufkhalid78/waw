import { Router } from "express";
import { getPreferences, updatePreferences } from "./preferences.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

// Authenticated: GET /api/user/preferences
router.get("/", requireAuth, getPreferences);

// Authenticated: PATCH /api/user/preferences
router.patch("/", requireAuth, updatePreferences);

export default router;
