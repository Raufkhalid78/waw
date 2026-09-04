import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { UserRole } from "../types/index.js";

export interface AuthenticatedUser {
  id: string;
  phone: string;
  email?: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies Bearer JWT token issued by Waw or Supabase Auth.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    let userId: string;
    let userPhone: string = "";
    let userEmail: string | undefined;
    let userRole: UserRole = UserRole.BUYER;

    // 1. First try verifying with JWT Secret
    if (ENV.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
        if (decoded && decoded.sub) {
          userId = decoded.sub;
          userPhone = decoded.phone || "";
          userEmail = decoded.email;
          userRole = decoded.role || UserRole.BUYER;

          // Fetch profile to check banned status
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role, phone, email, is_banned")
            .eq("id", userId)
            .single();

          if (profile?.is_banned) {
            res.status(403).json({ error: "Account has been banned" });
            return;
          }

          if (profile) {
            userRole = (profile.role as UserRole) || userRole;
            userPhone = profile.phone || userPhone;
            userEmail = profile.email || userEmail;
          }

          req.user = { id: userId, phone: userPhone, email: userEmail, role: userRole };
          return next();
        }
      } catch {
        // Fall back to Supabase Auth user verification
      }
    }

    // 2. Verify with Supabase Auth API
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      res
        .status(401)
        .json({ error: "Unauthorized: Invalid or expired session token" });
      return;
    }

    // Fetch user profile from Supabase Database
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, phone, email, is_banned")
      .eq("id", user.id)
      .single();

    if (profile?.is_banned) {
      res.status(403).json({ error: "Account has been banned" });
      return;
    }

    req.user = {
      id: user.id,
      phone: profile?.phone || user.phone || "",
      email: profile?.email || user.email,
      role: (profile?.role as UserRole) || UserRole.BUYER,
    };

    next();
  } catch (err: any) {
    res.status(401).json({ error: `Authentication failed: ${err.message}` });
  }
}
