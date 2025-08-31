const http = require('http');
const fs = require('fs');
const path = require('path');

// In-memory store of encrypted public payloads
// In production, replace with a database or persistent storage
const emergencyStore = {
  'demo-guid': 'demoiv==.demodata=='
};

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(indexHtml);
  }

  const guid = decodeURIComponent(req.url.slice(1));

  if (req.method === 'GET' && guid) {
    const payload = emergencyStore[guid];
    if (!payload) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ data: payload }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Public data endpoint listening on port ${PORT}`);
});
