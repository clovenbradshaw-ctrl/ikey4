const http = require('http');
const fs = require('fs');
const path = require('path');

// In-memory store of encrypted payloads
// In production, replace with a database or persistent storage
const emergencyStore = {
  'demo-guid': { data: 'demoiv==.demodata==', hash: null }
};

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Serve the application
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(indexHtml);
  }

  // API endpoint for sync and restore
  if (url.pathname === '/api') {
    if (req.method === 'GET') {
      const guid = url.searchParams.get('guid');
      const entry = guid && emergencyStore[guid];
      if (!entry) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Not found' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ data: entry.data }));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          const { guid, data, nextHash } = JSON.parse(body);
          if (!guid || !data) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid payload' }));
          }
          emergencyStore[guid] = { data, hash: nextHash };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // Fallback: treat path as GUID for public access
  if (req.method === 'GET' && url.pathname.length > 1) {
    const guid = decodeURIComponent(url.pathname.slice(1));
    const entry = emergencyStore[guid];
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ data: entry.data }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Public data endpoint listening on port ${PORT}`);
});
