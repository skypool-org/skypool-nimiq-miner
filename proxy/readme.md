# Skypool Nimiq proxy

## Build by yourself
1. Install [Node.js](https://nodejs.org/) v8.0.0 or higher.
2. Build the project: `cd skypool-nimiq-miner/proxy && yarn`.
3. Config `proxy_config.txt`, you can find usage and example in this file
4. Run `node proxy.js` to start proxy
5. Config the miner config file `config.txt`, change `server` value to the proxy url, e.g., `"server": "ws://localhost:8080",`
6. Start mining clients to start mining with proxy
