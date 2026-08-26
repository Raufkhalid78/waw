import re

with open('apps/api/src/modules/auth/auth.service.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the signature
c = c.replace('static async verifyWhatsAppOtp(phone: string, otp: string): Promise<{ token: string; user: any }> {', 'static async verifyWhatsAppOtp(phone: string, otp: string, requestedRole?: string, storeName?: string, city?: string): Promise<{ token: string; user: any }> {')

# Find the profile check
block = """
    let profile = existingProfile;

    if (!profile) {
      // Create user record in Supabase
      const newUserId = user__;

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUserId,
          phone: formattedPhone,
          full_name: Customer ,
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
          fullName: Customer ,
          role: UserRole.BUYER,
        };
      } else {
        profile = newProfile;
      }
    }
"""

replacement = """
    let profile = existingProfile;
    const isNewUser = !profile;

    if (isNewUser) {
      // Create user record in Supabase
      const newUserId = user__;
      
      let assignedRole = UserRole.BUYER;
      // Never allow self-provisioning of ADMIN
      if (requestedRole === UserRole.SELLER) {
        assignedRole = UserRole.SELLER;
      }

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUserId,
          phone: formattedPhone,
          full_name: storeName ? ${storeName} Owner : Customer ,
          role: assignedRole,
          is_whatsapp_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        profile = {
          id: newUserId,
          phone: formattedPhone,
          fullName: storeName ? ${storeName} Owner : Customer ,
          role: assignedRole,
        };
      } else {
        profile = newProfile;
      }

      // If they requested to be a seller and provided a store name, create a pending store application
      if (requestedRole === UserRole.SELLER && storeName && !insertError) {
        await supabaseAdmin.from('stores').insert({
          id: store_,
          owner_id: profile.id,
          store_name: storeName,
          city: city || 'Unknown',
          status: 'PENDING_KYC',
          seller_type: 'THIRD_PARTY',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Role enforcement for existing users
    if (!isNewUser && requestedRole) {
      if (requestedRole === UserRole.ADMIN && profile.role !== UserRole.ADMIN) {
        throw new Error('Unauthorized: Profile does not have Admin privileges.');
      }
      if (requestedRole === UserRole.SELLER && profile.role !== UserRole.SELLER) {
        throw new Error('Unauthorized: Profile does not have Seller privileges.');
      }
    }
"""

c = c.replace(block.strip(), replacement.strip())

with open('apps/api/src/modules/auth/auth.service.ts', 'w', encoding='utf-8') as f:
    f.write(c)
