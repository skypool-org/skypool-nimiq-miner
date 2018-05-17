# Skypool Nimiq Miner

This is [Skypool](https://nimiq.skypool.org) Nimiq Miner Client, using self-designed Nimiq mining protocol which is different to official p2p mining protocol, Skypool mining protocol get block data from server directly, which is more effieciency in bad netowork environment and need less client network bandwidth.

**Note** : Skypool Nimiq Miner is only compatible with Skypool Nimiq Servers, the server code is not open source.

Download Skypool Nimiq Mining Client in [release](https://github.com/skypool-org/skypool-nimiq-miner/releases).

In the release page, different version for different CPU instruction set to get the best hashrate:
* extreme --> avx512f
* fast --> avx2
* normal --> avx
* compat --> non-avx

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
