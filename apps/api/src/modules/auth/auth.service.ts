import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../config/supabase.js';
import { redis } from '../../config/redis.js';
import { WhatsAppService } from '../notifications/whatsapp.service.js';
import { ENV } from '../../config/env.js';
import { UserRole } from '@waw/types';

export class AuthService {
  /**
   * Generates a secure 6-digit OTP and dispatches via WhatsApp.
   */
  static async requestWhatsAppOtp(phone: string): Promise<{ success: boolean; message: string }> {
    const formattedPhone = phone.startsWith('+') ? phone : `+92${phone.replace(/^0+/, '')}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Cache in Redis for 5 minutes (300 seconds)
    await redis.set(`otp:${formattedPhone}`, otp, 'EX', 300);

    // Send WhatsApp OTP via Meta / Twilio Verify
    await WhatsAppService.sendOtp(formattedPhone, otp);

    return {
      success: true,
      message: `OTP sent successfully to ${formattedPhone} via WhatsApp`,
    };
  }

  /**
   * Verifies the OTP and signs in or registers the user in Supabase.
   */
  static async verifyWhatsAppOtp(phone: string, otp: string): Promise<{ token: string; user: any }> {
    const formattedPhone = phone.startsWith('+') ? phone : `+92${phone.replace(/^0+/, '')}`;
    const cachedOtp = await redis.get(`otp:${formattedPhone}`);

    // Gated test bypass: only allowed if explicitly enabled in non-production environments
    const isTestOtpAllowed = ENV.ALLOW_TEST_OTP && ENV.NODE_ENV !== 'production' && otp === '123456';

    if (!isTestOtpAllowed && cachedOtp !== otp) {
      throw new Error('Invalid or expired OTP code');
    }

    // Clear OTP upon successful verification
    await redis.del(`otp:${formattedPhone}`);

    // Check if user exists in Supabase profiles table
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone', formattedPhone)
      .maybeSingle();

    let profile = existingProfile;

    if (!profile) {
      // Create user record in Supabase
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUserId,
          phone: formattedPhone,
          full_name: `Customer ${formattedPhone.slice(-4)}`,
          role: UserRole.BUYER,
          is_whatsapp_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // In dev fallback if table not yet migrated
        profile = {
          id: newUserId,
          phone: formattedPhone,
          fullName: `Customer ${formattedPhone.slice(-4)}`,
          role: UserRole.BUYER,
        };
      } else {
        profile = newProfile;
      }
    }

    // Issue signed JWT token
    const token = jwt.sign(
      {
        sub: profile.id,
        phone: profile.phone,
        role: profile.role || UserRole.BUYER,
      },
      ENV.JWT_SECRET || 'waw_dev_jwt_secret_key_2026',
      { expiresIn: '30d' }
    );

    return { token, user: profile };
  }

  /**
   * Syncs profile after Supabase OAuth login (Google / Apple).
   */
  static async syncOAuthUser(supabaseUser: { id: string; email?: string; user_metadata?: any }): Promise<any> {
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (!existingProfile) {
      const { data: createdProfile } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: supabaseUser.id,
          email: supabaseUser.email,
          full_name: supabaseUser.user_metadata?.full_name || 'Waw Customer',
          avatar_url: supabaseUser.user_metadata?.avatar_url,
          phone: supabaseUser.user_metadata?.phone || `oauth_${supabaseUser.id.substring(0, 8)}`,
          role: UserRole.BUYER,
          is_whatsapp_verified: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      return createdProfile || { id: supabaseUser.id, email: supabaseUser.email, role: UserRole.BUYER };
    }

    return existingProfile;
  }
}
