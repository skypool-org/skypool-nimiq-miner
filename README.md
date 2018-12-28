# Skypool Nimiq Miner

This is [Skypool](https://nimiq.skypool.org) Nimiq Miner Client, using self-designed Nimiq mining protocol which is different to official p2p mining protocol, Skypool mining protocol get block data from server directly, which is more effieciency in bad netowork environment and need less client network bandwidth.

**Note** : Skypool Nimiq Miner is only compatible with Skypool Nimiq Servers, the server code is not open source.

Download Skypool Nimiq Mining Client in [release](https://github.com/skypool-org/skypool-nimiq-miner/releases).

In the release page, different version for different CPU instruction set to get the best hashrate:
* extreme --> avx512f
* fast --> avx2
* normal --> avx
* compat --> non-avx

## Usage
``` bash
node index.js --address=<address> [--name=<name>] [--thread=<thread>] [--server=<server>] [--percent=<percent>] [--cpu=<cpu>]
```

## Building by Yourself

1. Install [Node.js](https://nodejs.org) v8.0.0 or higher.
2. On Ubuntu and Debian, install `git` and `build-essential`: `sudo apt-get install -y git build-essential`.
    - On other Linux systems, install `git`, `python2.7`, `make`, `gcc` and `gcc-c++`.
    - For MacOS or Windows, [check here for git](https://git-scm.com/downloads) and [here for compilation tools](https://github.com/nodejs/node-gyp#on-mac-os-x).
3. Install `yarn` globally: `sudo npm install -g yarn`.
4. Install `gulp` globally:  `yarn global add gulp`.
5. Clone this repository: `git clone https://github.com/skypool-org/skypool-nimiq-miner`.
6. Build the project: `cd skypool-nimiq-miner && yarn`.
7. Config `config.txt`, Run `node index.js`.

---

# Skypool Nimiq Proxy
[Step by step tutorial for using proxy](https://github.com/skypool-org/skypool-nimiq-miner/wiki/Proxy-tutorial)

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
``` bash
node index.js --proxyServerPort=<proxyServerPort> --server=<server> [--miningAddress=<miningAddress>]
```

## Build by yourself
1. Install [Node.js](https://nodejs.org/) v8.0.0 or higher.
2. Build the project: `cd skypool-nimiq-miner/proxy && yarn`.
3. Config `proxy_config.txt`, you can find usage and example in this file
4. Run `node proxy.js` to start proxy
5. Config the miner config file `config.txt`, change `server` value to the proxy url, e.g., `"server": "ws://localhost:8080",`
6. Start mining clients to start mining with proxy
