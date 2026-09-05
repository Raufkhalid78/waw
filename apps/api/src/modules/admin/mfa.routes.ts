import { Router } from "express";
import crypto from "crypto";
import { supabaseAdmin } from "../../config/supabase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

// HMAC-SHA1 based HOTP/TOTP implementation (RFC 4226/6238)
function hmacSha1(key: Buffer, message: Buffer): Buffer {
  return crypto.createHmac("sha1", key).update(message).digest();
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter & 0xffffffff, 4);
  const hash = hmacSha1(secret, buf);
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

function generateTotp(secret: Buffer, timeStep = 30): string {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return hotp(secret, counter);
}

function generateSecret(): string {
  const bytes = crypto.randomBytes(20);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(str: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  str = str.replace(/[= ]/g, "").toUpperCase();
  let bits = "";
  for (const char of str) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

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
