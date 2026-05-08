const http = require('http');
const WebSocket = require('ws');
const net = require('net');

const TARGET_HOST = 'sfra.sploop.io';
const TARGET_PORT = 443;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs) => {
    const targetWs = new WebSocket(`wss://${TARGET_HOST}`, { rejectUnauthorized: false });
    
    targetWs.on('open', () => {
        clientWs.on('message', (msg) => targetWs.send(msg));
        targetWs.on('message', (msg) => clientWs.send(msg));
    });
    
    targetWs.on('close', () => clientWs.close());
    clientWs.on('close', () => targetWs.close());
    targetWs.on('error', () => clientWs.close());
    clientWs.on('error', () => targetWs.close());
});

server.listen(process.env.PORT || 3000);
