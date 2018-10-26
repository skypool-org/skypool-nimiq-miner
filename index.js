// for special packaging by skypool owners
global.skypool_package = false;

process.env.UV_THREADPOOL_SIZE = 128;
const os = require('os');
const util = require('util');
const ip = require('ip');
const EventEmitter = require('events').EventEmitter;
const Miner = require('./Miner.js');
const Log = require('@nimiq/core').Log;
const setTimeoutPromise = util.promisify(setTimeout);
const CPUType = require('./CPUType');

async function logWithoutExit(text) {
    for (;;) {
        Log.e(text);
        await setTimeoutPromise(2000);
    }
}

let miner = null;
let autoRestartInterval = null;
let switchInedx = 0;

const autoDetectCPU = async () => {
    const addon = require('./build/Release/detectCPU');
    const cpu = addon.detectCPU();
    Log.w('auto choose ' + cpu + ' version');
    return CPUType[cpu];
};

async function main() {
    let argv;
    // case: Windows
    if (os.platform() === 'win32') {
      try {
        // case: run by 'node index.js'
        argv = require('./' + 'config.txt');
      } catch(e) {
        // case: run by exe
        let path = process.execPath;
        path = `${path.slice(0, path.lastIndexOf('\\'))}\\config.txt`;
        argv = require(path);
      }
    } else {
        try {
            // case: Linux & MacOS terminal run, dynamic to avoid packaging
            argv = require('./' + 'config.txt');
        } catch(e) {
            // case: MacOS double click
            let path = process.execPath;
            path = `${path.slice(0, path.lastIndexOf('/'))}/config.txt`;
            argv = require(path);
        }
    }
    const argvCmd = require('minimist')(process.argv.slice(2));
    argv.address = argvCmd.address || argv.address;
    argv.name = argvCmd.name || argv.name;
    argv.thread = argvCmd.thread || argv.thread;
    argv.percent = argvCmd.percent || argv.percent;
    argv.server = argvCmd.server || argv.server;
    argv.cpu = argvCmd.cpu || argv.cpu;

    console.log(argv);

    if (!argv.address) {
        await logWithoutExit('Usage: node index.js --address=<address> [--name=<name>] [--thread=<thread>] [--server=<server>] [--percent=<percent>] [--cpu=<cpu>]');
    }

    const address = argv.address;

    let name = argv.name || '*';
    // auto set name
    if (name === '*') {
        name = [ip.address(), os.platform(), os.arch(), os.release()].join(' ');
        Log.w(`auto set name to ${name}`)
    }

    let thread = parseInt(argv.thread);
    const max_thread = os.cpus().length;
    if (thread > max_thread) {
        Log.w(`thread ${thread} larger than CPU threads ${max_thread}, force thread to ${max_thread}`);
        thread = max_thread;
    }
    if (thread === 0 || !Number.isInteger(thread)) {
        thread = max_thread > 1 ? max_thread - 1 : 1;
        Log.w(`auto set thread to ${thread}`);
    }
    if (thread < 0) {
        thread = max_thread;
        Log.w(`auto set thread to ${thread}`);
    }

    // switch server
    let server;
    if (typeof argv.server === 'object') {
        if (switchInedx >= argv.server.length) {
            switchInedx = 0;
        }
        server = argv.server[switchInedx];
        Log.w(`switch to server ${server}`);
    } else {
        server = argv.server;
    }


    const percent = parseFloat(argv.percent || 100);
    const event = new EventEmitter();

    // choose cpu version
    let cpu;
    if (argv.cpu && CPUType[argv.cpu]) {
        Log.w('CPU type given by user, choose ' + argv.cpu + ' version.');
        cpu = CPUType[argv.cpu];
    } else {
        cpu = await autoDetectCPU();
    }

    if (thread > 128) {
        logWithoutExit('Error: thread too large');
    } else if (thread <= 0) {
        logWithoutExit('Error: thread too small');
    } else if (address && address.length !== 44) {
        logWithoutExit('Error: address format error');
    } else if (name && name.length > 200) {
        logWithoutExit('Error: name too long');
    } else if (percent < 50 || percent > 100) {
        logWithoutExit('Error: percent need between 50 to 100');
    } else {
        miner = new Miner(server, address, name, thread, percent, event, cpu);
    }

    event.on('client_old', () => {
        clearInterval(autoRestartInterval);
        miner.delete();
        logWithoutExit('client version out of date, please download the latest mining client');
    });
    event.on('parameter_fail', () => {
        clearInterval(autoRestartInterval);
        miner.delete();
        logWithoutExit('parameters incorrect, please update parameters and restart the client');
    });
}

// auto restart when 3 * 20s has 0 hashrate
let zeroHashCount = 0;
autoRestartInterval = setInterval(() => {
    if (miner && miner._hashrateValue <= 0.01) {
        Log.w('Hashrate is zero');
        zeroHashCount++;
    } else {
        zeroHashCount = 0;
    }
    if (zeroHashCount >= 3) {
        Log.w('Restart beacuse of zero hashrate');
        zeroHashCount = 0;
        miner.delete();
        switchInedx += 1;
        main();
    }
}, 20000);

main();
