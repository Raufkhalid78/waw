import { Request, Response } from "express";
import { supabaseAdmin } from "../../config/supabase.js";

/**
 * GET /api/user/preferences — Returns the current user's preferences.
 */
export async function getPreferences(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("user_preferences")
      .select("theme, language, city")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: "Failed to fetch preferences" });
    }

    // Return defaults if no record exists
    res.json({
      theme: data?.theme || "light",
      language: data?.language || "en",
      city: data?.city || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /api/user/preferences — Updates the current user's preferences.
 */
export async function updatePreferences(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { theme, language, city } = req.body;

  // Validate inputs
  if (theme && !["light", "dark", "system"].includes(theme)) {
    return res.status(400).json({ error: "Invalid theme. Must be light, dark, or system." });
  }
  if (language && !["en", "ur"].includes(language)) {
    return res.status(400).json({ error: "Invalid language. Must be en or ur." });
  }

  try {
    const upsertData: Record<string, any> = { user_id: userId };
    if (theme !== undefined) upsertData.theme = theme;
    if (language !== undefined) upsertData.language = language;
    if (city !== undefined) upsertData.city = city;

    const { data, error } = await supabaseAdmin
      .from("user_preferences")
      .upsert(upsertData, { onConflict: "user_id" })
      .select("theme, language, city")
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to update preferences" });
    }

    res.json({
      theme: data.theme,
      language: data.language,
      city: data.city,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
