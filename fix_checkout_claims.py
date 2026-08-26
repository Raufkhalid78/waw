import re

with open('apps/web/src/app/checkout/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('100% Protected by State Bank of Pakistan (SBP) Escrow & PostEx Express Delivery', '100% Secure Payments & PostEx Delivery')
c = c.replace('Powered by PostEx XPay 256-bit encrypted checkout with 100% SBP Escrow guarantee.', 'Powered by PostEx XPay 256-bit encrypted checkout.')
c = c.replace('Processing Order in Escrow...', 'Processing Order...')
c = c.replace('SBP 100% Escrow Protection', '100% Secure Payments')
c = c.replace('Your payment is held in an SBP-regulated escrow account until you receive and verify your parcel from PostEx.', 'Your payment is processed securely via our trusted payment gateway.')

with open('apps/web/src/app/checkout/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
