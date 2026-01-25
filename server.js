const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Sploop Proxy Active');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (client, req) => {
  const url = new URL(req.url, 'http://localhost');
  const target = url.searchParams.get('target') || 'sfra.sploop.io';
  
  console.log('Bot connecting to:', target);
  
  const game = new WebSocket('wss://' + target + '/ws', {
    headers: {
      'Origin': 'https://sploop.io',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const queue = [];
  
  game.on('open', function() {
    console.log('Connected to game');
    for (let i = 0; i < queue.length; i++) {
      game.send(queue[i]);
    }
    queue.length = 0;
  });
  
  game.on('message', function(data) {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
  
  client.on('message', function(data) {
    if (game.readyState === 1) {
      game.send(data);
    } else {
      queue.push(data);
    }
  });
  
  game.on('close', function() { client.close(); });
  client.on('close', function() { game.close(); });
  game.on('error', function() { client.close(); });
  client.on('error', function() { game.close(); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Proxy running on port ' + PORT);
});
