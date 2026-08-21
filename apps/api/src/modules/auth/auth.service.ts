import jwt from 'jsonwebtoken';
import { prisma, supabaseAdmin } from '../../config/supabase.js';
import { redisClient } from '../../config/redis.js';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { UserRole } from '@waw/types';

export class AuthService {
  /**
   * Generates a 6-digit OTP and dispatches via WhatsApp.
   */
  static async requestWhatsAppOtp(phone: string): Promise<{ success: boolean; message: string }> {
    const formattedPhone = phone.startsWith('+') ? phone : `+92${phone.replace(/^0+/, '')}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Cache in Redis for 5 minutes (300 seconds)
    try {
      await redisClient.setex(`otp:${formattedPhone}`, 300, otp);
    } catch {
      // In-memory fallback if redis is offline
      (global as any)[`otp_${formattedPhone}`] = otp;
    }

    await WhatsAppService.sendOtp(formattedPhone, otp);

    return {
      success: true,
      message: `OTP sent successfully to ${formattedPhone} via WhatsApp`,
    };
  }

  /**
   * Verifies the OTP and signs in or registers the user.
   */
  static async verifyWhatsAppOtp(phone: string, otp: string): Promise<{ token: string; user: any }> {
    const formattedPhone = phone.startsWith('+') ? phone : `+92${phone.replace(/^0+/, '')}`;
    
    let cachedOtp: string | null = null;
    try {
      cachedOtp = await redisClient.get(`otp:${formattedPhone}`);
    } catch {
      cachedOtp = (global as any)[`otp_${formattedPhone}`] || null;
    }

    // Allow master dev bypass OTP '123456' for sandbox testing
    if (otp !== '123456' && cachedOtp !== otp) {
      throw new Error('Invalid or expired OTP code');
    }

    // Clear OTP
    try {
      await redisClient.del(`otp:${formattedPhone}`);
    } catch {
      delete (global as any)[`otp_${formattedPhone}`];
    }

    // Check if user exists in database
    let profile = await prisma.profile.findUnique({
      where: { phone: formattedPhone },
    });

    if (!profile) {
      // Create new buyer profile
      const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      profile = await prisma.profile.create({
        data: {
          id: newId,
          fullName: `Waw User ${formattedPhone.slice(-4)}`,
          phone: formattedPhone,
          role: UserRole.BUYER,
          isWhatsAppVerified: true,
        },
      });
    }

    // Generate session JWT
    const token = jwt.sign(
      {
        sub: profile.id,
        phone: profile.phone,
        role: profile.role,
      },
      process.env.JWT_SECRET || 'waw_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    return { token, user: profile };
  }

  /**
   * Syncs profile after Supabase OAuth login (Google / Apple).
   */
  static async syncOAuthUser(supabaseUser: { id: string; email?: string; user_metadata?: any }): Promise<any> {
    let profile = await prisma.profile.findUnique({
      where: { id: supabaseUser.id },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          fullName: supabaseUser.user_metadata?.full_name || 'Waw Customer',
          avatarUrl: supabaseUser.user_metadata?.avatar_url,
          phone: supabaseUser.user_metadata?.phone || `google_${supabaseUser.id.substring(0, 8)}`,
          role: UserRole.BUYER,
          isWhatsAppVerified: false,
        },
      });
    }

    return profile;
  }
}
