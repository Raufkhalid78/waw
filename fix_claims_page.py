import re

with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("<span>State Bank Regulated Escrow Guarantee</span>", "<span>Secure Payments</span>")
c = c.replace("Your money stays in secure escrow until you inspect your parcel. Enjoy hassle-free 7-day doorstep returns with free PostEx rider pickups nationwide.", "Your payments are protected. Enjoy a transparent delivery process.")
c = c.replace("<span>Learn About Escrow</span>", "<span>Learn About Buyer Protection</span>")

# Remove WawExpressSection
c = re.sub(r"import \{ WawExpressSection \} from '@/components/home/WawExpressSection';\n?", "", c)
c = re.sub(r"\{\/\* 5\. Fulfilled by Waw \(1P Official Express Catalog\) \*\/\}\s*<WawExpressSection \/>\n?", "", c)

with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
