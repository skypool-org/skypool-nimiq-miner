# Skypool Nimiq Proxy

## Why to use proxy
* Use Proxy if the Skypool nodes are blocked by cloud providers, e.g., Google Cloud Platform
* You can also hide your mining address on miner side, and set it on the proxy side
* Start proxy on an unblocked cloud server, e.g., AWS, so the proxy can connect to Skypool nodes
* Configure the blocked cloud server miners to proxy, so these miners can mine nimiq now

## Usage
1. Download Skypool Nimiq Proxy in [release](https://github.com/skypool-org/skypool-nimiq-miner/releases).
2. Start Proxy on an unblocked cloud server, with a public ip (for example, `1.2.3.4`)
3. Configure the Skypool Nimiq Miner's config file, and change `server` value to `"server": "ws://1.2.3.4:8080",`
4. Start mining now, you can see logs in proxy to see the number of connected miners

## Build by yourself
1. Install [Node.js](https://nodejs.org/) v8.0.0 or higher.
2. Build the project: `cd skypool-nimiq-miner/proxy && yarn`.
3. Config `proxy_config.txt`, you can find usage and example in this file
4. Run `node proxy.js` to start proxy
5. Config the miner config file `config.txt`, change `server` value to the proxy url, e.g., `"server": "ws://localhost:8080",`
6. Start mining clients to start mining with proxy
