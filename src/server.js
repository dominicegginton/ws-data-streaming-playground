const dotenv = require('dotenv');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

dotenv.config();
const PORT = process.env.PORT || 3000;

function requestListener(_, res) {
  console.time(`req: ${res.socket.remoteAddress}`);
  res.writeHead(200, { 'Content-Type': 'text/html' });

  const read = fs.createReadStream(__dirname + '/index.html');
  read.on('data', (chunk) => {
    /* replace %SERVER% with the server address */
    /* dont do silly here, use a templating engine */
    const chunkString = chunk.toString();
    const newString = chunkString.replace('%SERVER%', 'ws://localhost:3000');

    const newChunk = Buffer.from(newString);
    res.write(newChunk);
  });

  read.on('end', () => {
    res.end();
    console.timeEnd(`req: ${res.socket.remoteAddress}`);
  });
};

function connection(ws) {
  function message(message) {
    const data = message.toString();
    switch (data) {
      case 'start-streaming':
        ws.send('streaming-started');
        const read = fs.createReadStream(__filename);
        read.on('data', (chunk) => {
          /* Split the chunk into smaller chunks to simulate streaming a large file */
          const chunkSize = 8;
          const buffer = Buffer.from(chunk);
          const chunks = [];
          for (let i = 0; i < buffer.length; i += chunkSize) {
            chunks.push(buffer.slice(i, i + chunkSize));
          }
          chunks.forEach((chunk) =>
            ws.send(chunk.toString())
          );
        });

        read.on('end', () => {
          ws.send('streaming-ended');
          ws.terminate();
        });
        break;
      case 'stop-streaming':
        console.log(`ws: ${ws._socket.remoteAddress} stopped streaming`);
        ws.terminate();
        break;
    }
  }

  function error() {
    ws.terminate();
  }

  ws.on('message', message);
  ws.on('error', error);
};

const httpServer = http.createServer();
httpServer.on('request', requestListener);

const wss = new WebSocket.Server({ server: httpServer });
wss.on('connection', connection);

httpServer.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});
