const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Sploop Proxy OK');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (clientSocket, req) => {
  const parsedUrl = url.parse(req.url, true);
  const target = parsedUrl.query.target || 'sfra.sploop.io';
  
  // "bot1" ekle - orijinal bağlantı gibi
  const targetUrl = 'wss://' + target + '/wsbot1';
  
  console.log('[PROXY] Connecting to:', targetUrl);
  
  // Rastgele Sec-WebSocket-Key oluştur
  const wsKey = crypto.randomBytes(16).toString('base64');
  
  let gameSocket = null;
  const messageQueue = [];
  let isGameConnected = false;
  
  try {
    gameSocket = new WebSocket(targetUrl, {
      headers: {
        'Host': target,
        'Origin': 'https://sploop.io',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Extensions': 'permessage-deflate',
        'Sec-WebSocket-Key': wsKey,
        'Connection': 'keep-alive, Upgrade',
        'Upgrade': 'websocket',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      },
      handshakeTimeout: 15000,
      perMessageDeflate: false
    });
  } catch (err) {
    console.log('[PROXY] Connection error:', err.message);
    clientSocket.close();
    return;
  }
  
  gameSocket.on('open', () => {
    console.log('[PROXY] Game connected!');
    isGameConnected = true;
    
    while (messageQueue.length > 0) {
      try {
        gameSocket.send(messageQueue.shift());
      } catch (e) {}
    }
  });
  
  gameSocket.on('message', (data) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      try {
        clientSocket.send(data);
      } catch (e) {}
    }
  });
  
  gameSocket.on('close', (code) => {
    console.log('[PROXY] Game closed, code:', code);
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
  });
  
  gameSocket.on('error', (err) => {
    console.log('[PROXY] Game error:', err.message);
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close();
    }
  });
  
  clientSocket.on('message', (data) => {
    if (isGameConnected && gameSocket.readyState === WebSocket.OPEN) {
      try {
        gameSocket.send(data);
      } catch (e) {}
    } else {
      messageQueue.push(data);
    }
  });
  
  clientSocket.on('close', () => {
    console.log('[PROXY] Client closed');
    if (gameSocket) gameSocket.close();
  });
  
  clientSocket.on('error', () => {
    if (gameSocket) gameSocket.close();
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('[PROXY] Running');
});
