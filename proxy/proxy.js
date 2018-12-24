const WebSocketServer = require('websocket').server;
const WebSocketClient = require('websocket').client;
const http = require('http');
const os = require('os');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);
const P = require('../Protocol.js');

// record connected status
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
  if (os.platform() === 'win32') {
      try {
        // case: run by 'node index.js'
        argv = require('./' + 'proxy_config.txt');
      } catch(e) {
        // case: run by exe
        let path = process.execPath;
        path = `${path.slice(0, path.lastIndexOf('\\'))}\\proxy_config.txt`;
        argv = require(path);
      }
  } else {
      try {
        // case: Linux & MacOS terminal run, dynamic to avoid packaging
        argv = require('./' + 'proxy_config.txt');
      } catch(e) {
        // case: MacOS double click
        let path = process.execPath;
        path = `${path.slice(0, path.lastIndexOf('/'))}/proxy_config.txt`;
        argv = require(path);
      }
  }
  
  const argvCmd = require('minimist')(process.argv.slice(2));
  argv.miningAddress = argvCmd.miningAddress || argv.miningAddress;
  argv.server = argvCmd.server || argv.server;
  argv.proxyServerPort = argvCmd.proxyServerPort || argv.proxyServerPort;

  console.log(argv);

  // parse port
  if (!argv.proxyServerPort) {
    await logWithoutExit('Usage: node index.js --proxyServerPort=<proxyServerPort> --server=<server> [--miningAddress=<miningAddress>]');
  }
  const proxyPort = argv.proxyServerPort;

  // parse address
  const miningAddress = argv.miningAddress;
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
    connectionNumber++;

    // connect to skypool node websocket
    const client = new WebSocketClient();

    client.on('connectFailed', (error) => {
      console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', (connection) => {
      upstream = connection;
      // send cached msg to skypool server
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
        // close client connection after server connection close
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

        let data = message.utf8Data;

        // set mining address if user set it
        const json = JSON.parse(data);
        if (json.t === P.Register && miningAddress) {
          json.d[P.Register_Address] = miningAddress;
          data = JSON.stringify(json);
        }

        // is upstream is not initialized, cache the msg to a queue; otherwise send it to server
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
      // close server connection after client connection close
      upstream.close();
      connectionNumber--;
    });
  });
}

main();
