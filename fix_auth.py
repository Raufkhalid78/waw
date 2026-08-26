import re

with open('apps/api/src/modules/auth/auth.controller.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('const { phone, otp } = req.body;', 'const { phone, otp, role, storeName, city } = req.body;')
c = c.replace('AuthService.verifyWhatsAppOtp(phone, otp);', 'AuthService.verifyWhatsAppOtp(phone, otp, role, storeName, city);')

with open('apps/api/src/modules/auth/auth.controller.ts', 'w', encoding='utf-8') as f:
    f.write(c)
