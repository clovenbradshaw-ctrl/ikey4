const http = require('http');

// In-memory store of encrypted public payloads
// In production, replace with a database or persistent storage
const emergencyStore = {
  'demo-guid': JSON.stringify({
    iv: 'demoiv==',
    data: 'demodata=='
  })
};

const server = http.createServer((req, res) => {
  const guid = decodeURIComponent(req.url.slice(1));

  if (req.method === 'GET' && guid) {
    const payload = emergencyStore[guid];
    if (!payload) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not found' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ public: payload }));
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Public data endpoint listening on port ${PORT}`);
});
