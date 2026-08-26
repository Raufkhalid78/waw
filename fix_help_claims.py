import re

with open('apps/web/src/app/help/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('For 1P Waw Express items in major cities (Lahore, Karachi, Islamabad, Rawalpindi), delivery takes 24 hours. For 3P verified artisan orders and other cities across Pakistan, standard delivery takes 48-72 hours via TCS / PostEx.', 'Delivery across Pakistan generally takes 2-5 business days.')
c = c.replace('How does State Bank Escrow Protection safeguard my money?', 'How does Buyer Protection safeguard my payments?')

with open('apps/web/src/app/help/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
