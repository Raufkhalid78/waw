import { Router } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  generateSecret,
  generateTotp,
  base32Decode,
  hotp,
  verifyTotp,
} from "./totp.util.js";

const router = Router();

// GET /api/admin/mfa/status - Check MFA enrollment status
router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from("admin_mfa")
      .select("secret, is_enabled, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;

    res.json({
      enrolled: !!data?.secret,
      enabled: data?.is_enabled || false,
      createdAt: data?.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/mfa/enroll - Generate TOTP secret and return QR code data
router.post("/enroll", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const secret = generateSecret();

    // Store secret (not yet enabled)
    const { error: upsertError } = await supabaseAdmin
      .from("admin_mfa")
      .upsert(
        {
          user_id: userId,
          secret,
          is_enabled: false,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) throw upsertError;

    // Generate TOTP URI for QR code (otpauth://totp/...)
    const issuer = "Waw Admin";
    const account = req.user!.email || req.user!.phone || "admin";
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    res.json({
      otpauthUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/mfa/verify - Verify TOTP code and enable MFA
router.post("/verify", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: "Code must be 6 digits" });
    }

    const { data, error } = await supabaseAdmin
      .from("admin_mfa")
      .select("secret")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data?.secret) {
      return res.status(400).json({ error: "No MFA enrollment found. Please enroll first." });
    }

    const secretBytes = base32Decode(data.secret);
    const expectedCode = generateTotp(secretBytes);

    // Allow ±1 time step tolerance (current, previous, next)
    const counter = Math.floor(Date.now() / 1000 / 30);
    const prevCode = hotp(secretBytes, counter - 1);
    const nextCode = hotp(secretBytes, counter + 1);

    if (code !== expectedCode && code !== prevCode && code !== nextCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    // Enable MFA
    const { error: updateError } = await supabaseAdmin
      .from("admin_mfa")
      .update({ is_enabled: true, verified_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    res.json({ success: true, message: "MFA enabled successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/mfa/disable - Disable MFA
router.post("/disable", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    // Require current TOTP code to disable
    const { data, error } = await supabaseAdmin
      .from("admin_mfa")
      .select("secret, is_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data?.is_enabled) {
      return res.status(400).json({ error: "MFA is not enabled" });
    }

    const secretBytes = base32Decode(data.secret);
    const counter = Math.floor(Date.now() / 1000 / 30);
    const expectedCode = hotp(secretBytes, counter);
    const prevCode = hotp(secretBytes, counter - 1);

    if (code !== expectedCode && code !== prevCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const { error: updateError } = await supabaseAdmin
      .from("admin_mfa")
      .update({ is_enabled: false })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    res.json({ success: true, message: "MFA disabled successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/mfa/check - Check if MFA verification is required during login
router.post("/check", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabaseAdmin
      .from("admin_mfa")
      .select("is_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    res.json({ mfaRequired: data?.is_enabled || false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
