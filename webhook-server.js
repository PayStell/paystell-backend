const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3333; // Make sure this port is available

// Parse JSON bodies
app.use(bodyParser.json());

// Webhook secret for verification
let webhookSecret = '';

// Set up simple logging
const logDir = path.join(__dirname, 'webhook-logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logWebhook = (webhook) => {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = path.join(logDir, `webhook-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(webhook, null, 2));
  console.log(`Webhook logged to ${filename}`);
};

// Main webhook receiver endpoint
app.post('/webhooks/paystell', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  console.log('=== Webhook Received ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(payload, null, 2));
  
  // Verify signature if we have a secret
  if (webhookSecret && signature) {
    const isValid = verifySignature(payload, signature, webhookSecret);
    console.log('Signature verification:', isValid ? 'VALID' : 'INVALID');
    
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid signature'
      });
    }
  }
  
  // Log the webhook
  logWebhook({
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: payload
  });
  
  // Respond with success
  res.status(200).json({
    status: 'success',
    message: 'Webhook received successfully'
  });
});

// Utility endpoint to set the webhook secret
app.post('/set-secret', (req, res) => {
  const { secret } = req.body;
  
  if (!secret) {
    return res.status(400).json({
      status: 'error',
      message: 'Secret is required'
    });
  }
  
  webhookSecret = secret;
  
  res.status(200).json({
    status: 'success',
    message: 'Webhook secret set successfully'
  });
});

// Home page with instructions
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>PayStell Webhook Test Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>PayStell Webhook Test Server</h1>
        <p>This server is running on port ${PORT} and is ready to receive webhooks.</p>
        
        <h2>Webhook URL</h2>
        <p>Use this URL when registering your webhook in PayStell:</p>
        <pre>http://localhost:${PORT}/webhooks/paystell</pre>
        
        <h2>Setting a Webhook Secret</h2>
        <p>To set a secret for signature verification:</p>
        <pre>curl -X POST http://localhost:${PORT}/set-secret \\
  -H "Content-Type: application/json" \\
  -d '{"secret": "your-webhook-secret"}'</pre>
        
        <h2>View Logs</h2>
        <p>Webhook logs are stored in the <code>webhook-logs</code> directory.</p>
      </body>
    </html>
  `);
});

// Helper function to verify signatures
function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const calculatedSignature = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

// Start the server
app.listen(PORT, () => {
  console.log(`Webhook test server running at http://localhost:${PORT}`);
}); 