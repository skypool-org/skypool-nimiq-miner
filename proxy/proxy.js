const WebSocketServer = require('websocket').server;
const WebSocketClient = require('websocket').client;
const http = require('http');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const skypoolServer = 'ws://hk1.xmr.skypool.org:4000/';
const proxyPort = 8080;

async function main() {
  const server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
  server.listen(proxyPort, function() {
    console.log((new Date()) + ' Server is listening on port ' + proxyPort);
  });

  const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
  });


  wsServer.on('request', async function(request) {
    let downstream = request.accept( null, request.origin);
    let upstream;

    // 连接天池服务器ws
    const client = new WebSocketClient();

    client.on('connectFailed', function(error) {
      console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', function(connection) {
      upstream = connection;
      console.log('WebSocket Client Connected');
      connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
      });
      connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
      });
      connection.on('message', function(message) {
        if (message.type === 'utf8') {
          console.log("Received: '" + message.utf8Data + "'");
          downstream.sendUTF(message.utf8Data);
        }
      });
    });

    client.connect(skypoolServer, null);

    // console.log(request);

    console.log((new Date()) + ' Connection accepted.');
    downstream.on('message', async function(message) {
      if (message.type === 'utf8') {
        console.log('Received Message: ' + message.utf8Data);
        // connection.sendUTF(message.utf8Data);
        // TODO await upstream 还未初始化
        while (upstream === undefined) {
          await setTimeoutPromise(100);
        }
        upstream.sendUTF(message.utf8Data);
      }
      else if (message.type === 'binary') {
        console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
        // connection.sendBytes(message.binaryData);
      }
    });
    downstream.on('close', function(reasonCode, description) {
      console.log((new Date()) + ' Peer ' + downstream.remoteAddress + ' disconnected.');
    });
  });
}

main();
