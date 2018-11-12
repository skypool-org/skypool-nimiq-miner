const WebSocketServer = require('websocket').server;
const WebSocketClient = require('websocket').client;
const http = require('http');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);
const P = require('../Protocol.js');

// 记录当前连接状态
let connectionNumber = 0;
setInterval(() => { printConnectionNumber(); }, 10000);

async function logWithoutExit(text) {
  for (;;) {
    console.log(getTime() + text);
    await setTimeoutPromise(2000);
  }
}

function printConnectionNumber() {
  console.log(getTime() + `Number of connected devices: ${connectionNumber}`);
}

function getTime() {
  return '[' + new Date().toTimeString().substr(0, 8) + '] ';
}


async function main() {
  let argv;
  try {
    // case: Linux & MacOS terminal run, dynamic to avoid packaging
    argv = require('./' + 'proxy_config.txt');
  } catch(e) {
    // case: MacOS double click
    let path = process.execPath;
    path = `${path.slice(0, path.lastIndexOf('/'))}/proxy_config.txt`;
    argv = require(path);
  }
  const argvCmd = require('minimist')(process.argv.slice(2));
  argv.address = argvCmd.address || argv.address;
  argv.server = argvCmd.server || argv.server;
  argv.port = argvCmd.port || argv.port;

  console.log(argv);

  // parse port
  if (!argv.port) {
    await logWithoutExit('Usage: node index.js --port=<port> --server=<server> [--address=<address>]');
  }
  const proxyPort = argv.port;

  // parse address
  const miningAddress = argv.address;
  if (miningAddress && miningAddress.length !== 44) {
    await logWithoutExit('Error: address format error');
  }

  // parse server
  let skypoolServer = argv.server;
  if (!skypoolServer) {
    await logWithoutExit('Error: server not set');
  }

  // initial ws
  const server = http.createServer(function(request, response) {
    console.log(getTime() + 'Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
  server.listen(proxyPort, () => {
    console.log(getTime() + 'Server is listening on port ' + proxyPort);
  });

  const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
  });


  // client connect
  wsServer.on('request', async (request) => {
    let downstream = request.accept( null, request.origin);
    let upstream;
    let msgQueue = [];
    let switchInedx = 0;
    connectionNumber++;

    // 连接天池服务器ws
    const client = new WebSocketClient();

    client.on('connectFailed', (error) => {
      console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', (connection) => {
      upstream = connection;
      // 将缓存的消息转发给天池 server
      if (msgQueue.length !== 0) {
        for (let i = 0; i < msgQueue.length; i++) {
          upstream.sendUTF(msgQueue[i]);
        }
        msgQueue = [];
      }

      console.log(getTime() + 'WebSocket Client Connected');
      connection.on('error', (error) => {
        console.log(getTime() + "Connection Error: " + error.toString());
      });
      connection.on('close', () => {
        console.warn(getTime() + 'Skypool server Connection Closed');
        // 服务端关闭后，关闭客户端连接
        downstream.close();
      });
      connection.on('message', (message) => {
        if (message.type === 'utf8') {
          // console.log("Received: '" + message.utf8Data + "'");
          downstream.sendUTF(message.utf8Data);
        }
      });
    });

    client.connect(skypoolServer, null);


    console.log(getTime() + 'Connection accepted.');
    downstream.on('message', async (message) => {
      if (message.type === 'utf8') {
        // console.log('Received Message: ' + message.utf8Data);
        // connection.sendUTF(message.utf8Data);

        let data = message.utf8Data;

        // set mining address if user set it
        const json = JSON.parse(data);
        if (json.t === P.Register && miningAddress) {
          json.d[P.Register_Address] = miningAddress;
          data = JSON.stringify(json);
        }


        // 如果 upstream 还未初始化，就先将消息存放进缓存；否则就转发
        if (upstream === undefined) {
          // console.log(getTime() + 'push msg' + data);
          msgQueue.push(data);
        } else {
          upstream.sendUTF(data);
        }

      }
    });
    downstream.on('close', (reasonCode, description) => {
      console.warn(getTime() + 'Peer ' + downstream.remoteAddress + ' disconnected.');
      // 客户端关闭后，关闭服务端连接
      upstream.close();
      connectionNumber--;
    });
  });
}

main();
