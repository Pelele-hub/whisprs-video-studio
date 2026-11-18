const http = require('http');

const payload = JSON.stringify({
  title: "You're Not Out of Time",
  hook: "Just because you took longer than others..."
});

const req = http.request({
  hostname: 'localhost',
  port: 5678,
  path: '/webhook/generate-whisprs-v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`[n8n Trigger] Response Status: ${res.statusCode}`);
    console.log(`[n8n Trigger] Response Body:`, data);
  });
});

req.on('error', err => {
  console.error('[n8n Trigger] Request Error:', err.message);
});

req.write(payload);
req.end();
