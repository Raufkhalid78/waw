const fs = require('fs');

let c = fs.readFileSync('apps/api/src/modules/auth/auth.service.ts', 'utf-8');

const oldBlock = `    let profile = existingProfile;

    if (!profile) {
      // Create user record in Supabase
      const newUserId = \`user_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUserId,
          phone: formattedPhone,
          full_name: \`Customer \${formattedPhone.slice(-4)}\`,
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
          fullName: \`Customer \${formattedPhone.slice(-4)}\`,
          role: UserRole.BUYER,
        };
      } else {
        profile = newProfile;
      }
    }`;

const newBlock = `    let profile = existingProfile;
    const isNewUser = !profile;

    if (isNewUser) {
      // Create user record in Supabase
      const newUserId = \`user_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;
      
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
          full_name: storeName ? \`\${storeName} Owner\` : \`Customer \${formattedPhone.slice(-4)}\`,
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
          fullName: storeName ? \`\${storeName} Owner\` : \`Customer \${formattedPhone.slice(-4)}\`,
          role: assignedRole,
        };
      } else {
        profile = newProfile;
      }

      // If they requested to be a seller and provided a store name, create a pending store application
      if (requestedRole === UserRole.SELLER && storeName && !insertError) {
        await supabaseAdmin.from('stores').insert({
          id: \`store_\${Date.now()}\`,
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
    }`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
} else {
  // Ignore Windows line endings difference
  const oldBlockRegex = /let profile = existingProfile;[\s\S]*?profile = newProfile;\s*\}/;
  if (oldBlockRegex.test(c)) {
      c = c.replace(oldBlockRegex, newBlock);
  } else {
      console.log("Could not find block!");
  }
}

fs.writeFileSync('apps/api/src/modules/auth/auth.service.ts', c, 'utf-8');
