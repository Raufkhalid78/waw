const fs = require('fs');
let c = fs.readFileSync('apps/api/src/app.ts', 'utf-8');

const webhookRegex = /app\.post\('\/api\/logistics\/postex\/webhook', async \(req, res\) => \{\n    try \{\n      const result = await CourierService\.handlePostExWebhook\(req\.body\);\n      res\.json\(result\);\n    \} catch \(err: any\) \{\n      res\.status\(400\)\.json\(\{ error: err\.message \}\);\n    \}\n  \}\);/g;

const newWebhook = `app.post('/api/logistics/postex/webhook', async (req, res) => {
    try {
      const signature = req.headers['x-postex-signature'] as string | undefined;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      
      if (!signature) {
        res.status(401).json({ error: 'Missing PostEx webhook signature' });
        return;
      }
      
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.POSTEX_API_TOKEN || 'test_token')
        .update(rawBody)
        .digest('hex');
        
      if (signature !== expectedSignature && process.env.NODE_ENV === 'production') {
        res.status(401).json({ error: 'Invalid PostEx webhook signature' });
        return;
      }

      const result = await CourierService.handlePostExWebhook(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });`;

c = c.replace(webhookRegex, newWebhook);
fs.writeFileSync('apps/api/src/app.ts', c, 'utf-8');
