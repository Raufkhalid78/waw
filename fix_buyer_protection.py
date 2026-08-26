import re

with open('apps/web/src/app/buyer-protection/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('100% Secure Checkout & Escrow', '100% Secure Checkout')
c = c.replace('Every transaction on Waw is safeguarded under our Institutional Escrow Trust mechanism. Your money is never released to the seller until your order is delivered, inspected, and confirmed.', 'Every transaction on Waw is securely processed.')
c = c.replace('1. Escrow Protection Vault', '1. Secure Checkout')
c = c.replace('Whether you pay online via Card, Instant QR, or Mobile Wallets, funds remain safely in an institutional escrow account until delivery.', 'Your payment is processed through a safe, encrypted gateway.')
c = c.replace('How Escrow Works Step-by-Step', 'How Buyer Protection Works Step-by-Step')
c = c.replace('How the Escrow Process Protects You', 'How the Payment Process Protects You')
c = c.replace('Your payment is placed into secure institutional escrow.', 'Your payment is verified.')
c = c.replace('Our customer dispute & escrow resolution team is available 24/7 on WhatsApp.', 'Our customer dispute resolution team is available on WhatsApp.')

with open('apps/web/src/app/buyer-protection/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
