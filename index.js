process.env.UV_THREADPOOL_SIZE = 128;
const START = Date.now();
const os = require('os');
const Nimiq = require('@nimiq/core');
const argv = require('minimist')(process.argv.slice(2));
let config;

async function logWithoutExit(text) {
    for (;;) {
        Log.e(text);
        await setTimeoutPromise(5000);
    }
}

try {
    config = require('./config.js');
} catch(e) {
    // macbook double click
    let path = process.execPath;
    path = `${path.slice(0, path.lastIndexOf('/'))}/config.js`;
    config = require(path);
}

config.address = argv.address || config.address;
config.deviceId = argv.deviceId || config.deviceId;
config.threads = argv.threads || config.threads;
config.host = argv.host || config.host;
config.port = argv.port || config.port;
config.isNano = argv.isNano || config.isNano;

const seedPeers = config.seedPeers;
delete config.seedPeers;
console.log(config);
config.seedPeers = seedPeers || [];

const isNano = config.isNano ? true : false;
config.type = isNano ? 'nano' : 'full';

let threads = parseInt(config.threads);
const max_threads = os.cpus().length;
if (threads > max_threads) {
    Nimiq.Log.w(`threads ${threads} larger than CPU threads ${max_threads}, force thread to ${max_threads}`);
    threads = max_threads;
} else if (threads === 0) {
    threads = max_threads > 1 ? max_threads - 1 : 1;
    Nimiq.Log.i(`auto set thread to ${threads}`);
}
config.threads = threads;


if (typeof config.deviceId !== 'number' || config.deviceId < 0 || config.deviceId > 2147483647) {
    logWithoutExit('Error: deviceId should be number and between 0 to 2147483647');
} else if (config.threads <= 0 || config.threads > 128) {
    logWithoutExit('Error: thread too out of range, 0 to 128');
} else if (config.address && config.address.length !== 44) {
    logWithoutExit('Error: address format error');
}

for (const seedPeer of config.seedPeers) {
    if (!seedPeer.host || !seedPeer.port) {
        logWithoutExit('Seed peers must have host and port attributes set');
    }
}




const TAG = 'Node';
const $ = {};

(async () => {
    Nimiq.Log.i(TAG, `Skypool Nimiq Miner starting`);

    Nimiq.GenesisConfig.init(Nimiq.GenesisConfig.CONFIGS['main']);

    for(const seedPeer of config.seedPeers) {
        Nimiq.GenesisConfig.SEED_PEERS.push(Nimiq.WsPeerAddress.seed(seedPeer.host, seedPeer.port, seedPeer.publicKey));
    }

    const networkConfig = new Nimiq.DumbNetworkConfig();

    switch (config.type) {
        case 'nano':
            $.consensus = await Nimiq.Consensus.nano(networkConfig);
            break;
        default: // full
            $.consensus = await Nimiq.Consensus.full(networkConfig);
            break;
    }

    $.blockchain = $.consensus.blockchain;
    $.accounts = $.blockchain.accounts;
    $.mempool = $.consensus.mempool;
    $.network = $.consensus.network;

    Nimiq.Log.i(TAG, `Peer address: ${networkConfig.peerAddress.toString()} - public key: ${networkConfig.keyPair.publicKey.toHex()}`);

    const address = Nimiq.Address.fromUserFriendlyAddress(config.address);
    $.wallet = {address: address};
    const account = !isNano ? await $.accounts.get($.wallet.address) : null;
    Nimiq.Log.i(TAG, `Wallet initialized for address ${$.wallet.address.toUserFriendlyAddress()}.`
        + (!isNano ? ` Balance: ${Nimiq.Policy.satoshisToCoins(account.balance)} NIM` : ''));

    Nimiq.Log.i(TAG, `Blockchain state: height=${$.blockchain.height}, headHash=${$.blockchain.headHash}`);

    const deviceId = config.deviceId;
    const poolMode = isNano ? 'nano' : 'smart';
    switch (poolMode) {
        case 'nano':
            $.miner = new Nimiq.NanoPoolMiner($.blockchain, $.network.time, $.wallet.address, deviceId);
            break;
        case 'smart':
        default:
            $.miner = new Nimiq.SmartPoolMiner($.blockchain, $.accounts, $.mempool, $.network.time, $.wallet.address, deviceId, new Uint8Array(0));
            break;
    }
    $.consensus.on('established', () => {
        Nimiq.Log.i(TAG, `Connecting to pool ${config.host} using device id ${deviceId} as a ${poolMode} client.`);
        $.miner.connect(config.host, config.port);
    });

    $.blockchain.on('head-changed', (head) => {
        if ($.consensus.established || head.height % 100 === 0) {
            Nimiq.Log.i(TAG, `Now at block: ${head.height}`);
        }
    });

    $.network.on('peer-joined', (peer) => {
        Nimiq.Log.i(TAG, `Connected to ${peer.peerAddress.toString()}`);
    });
    $.network.on('peer-left', (peer) => {
        Nimiq.Log.i(TAG, `Disconnected from ${peer.peerAddress.toString()}`);
    });

    $.network.connect();
    $.consensus.on('established', () => $.miner.startWork());
    $.consensus.on('lost', () => $.miner.stopWork());

    $.miner.threads = config.threads;
    $.miner.throttleAfter = Infinity;
    $.miner.throttleWait = 1;

    $.consensus.on('established', () => {
        Nimiq.Log.i(TAG, `Blockchain ${config.type}-consensus established in ${(Date.now() - START) / 1000}s.`);
        Nimiq.Log.i(TAG, `Current state: height=${$.blockchain.height}, totalWork=${$.blockchain.totalWork}, headHash=${$.blockchain.headHash}`);
    });

    $.miner.on('block-mined', (block) => {
        Nimiq.Log.i(TAG, `Block mined: #${block.header.height}, hash=${block.header.hash()}`);
    });

    const hashrates = [];
    const outputInterval = 10;
    $.miner.on('hashrate-changed', async (hashrate) => {
        hashrates.push(hashrate);
        if (hashrates.length >= outputInterval) {
            const sum = hashrates.reduce((acc, val) => acc + val, 0);
            Nimiq.Log.i(TAG, `Hashrate: ${(sum / hashrates.length).toFixed(2).padStart(7)} H/s`);
            hashrates.length = 0;
        }
    });

})().catch(e => {
    console.error(e);
    logWithoutExit(e);
});
