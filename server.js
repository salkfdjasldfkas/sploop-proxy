const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Sploop Proxy Active\n\nUsage: wss://sploop-proxy.onrender.com/?target=sfra.sploop.io');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientSocket, req) => {
  const parsedUrl = url.parse(req.url, true);
  const target = parsedUrl.query.target || 'sfra.sploop.io';
  const targetUrl = 'wss://' + target + '/ws';
  
  console.log('[PROXY] New connection, target:', targetUrl);
  
  let gameSocket = null;
  const messageQueue = [];
  let isGameConnected = false;
  
  try {
    gameSocket = new WebSocket(targetUrl, {
      headers: {
        'Origin': 'https://sploop.io',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      handshakeTimeout: 10000
    });
  } catch (err) {
    console.log('[PROXY] Failed to create game socket:', err.message);
    clientSocket.close();
    return;
  }
  
  gameSocket.on('open', () => {
    console.log('[PROXY] Connected to game server');
    isGameConnected = true;
    
    // Kuyruktaki mesajları gönder
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      try {
        gameSocket.send(msg);
      } catch (e) {}
    }
  });
  
  gameSocket.on('message', (data) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      try {
        clientSocket.send(data);
      } catch (e) {
        console.log('[PROXY] Error sending to client:', e.message);
      }
    }
  });
  
  gameSocket.on('close', (code, reason) => {
    console.log('[PROXY] Game connection closed. Code:', code);
    isGameConnected = false;
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
  });
  
  gameSocket.on('error', (err) => {
    console.log('[PROXY] Game socket error:', err.message);
    isGameConnected = false;
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
  });
  
  clientSocket.on('message', (data) => {
    if (isGameConnected && gameSocket.readyState === WebSocket.OPEN) {
      try {
        gameSocket.send(data);
      } catch (e) {
        console.log('[PROXY] Error sending to game:', e.message);
      }
    } else {
      messageQueue.push(data);
    }
  });
  
  clientSocket.on('close', () => {
    console.log('[PROXY] Client disconnected');
    if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
      gameSocket.close();
    }
  });
  
  clientSocket.on('error', (err) => {
    console.log('[PROXY] Client socket error:', err.message);
    if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
      gameSocket.close();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('[PROXY] Server running on port', PORT);
});
