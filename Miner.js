const util = require('util');
const os = require('os');
const atob = require('atob');
const WebSocketClient = require('websocket').client;
const Nimiq = require('@nimiq/core');
const Log = Nimiq.Log;
const BigNumber = Nimiq.BigNumber;
let NodeNative;
const P = require('./Protocol.js');
const setTimeoutPromise = util.promisify(setTimeout);

const RANGE = 4096;
const WORKLOADS_PER_THREAD_PC = 75; // 1 thread is 75 * 4096 nonces
const DIFFICULT_PER_THREAD_PC = 2; // 1 thread is 2 difficulty, one share equal to 2*thread*Math.pow(2 ,16) Hashes, 2*thread*65536

class Miner {

    constructor(server, address, name, threads, percent, event, cpu) {
        /** miner metadata */
        this._version = 8;
        this._platform = [os.platform(), os.arch(), os.release()].join(' ');

        this._address = address;
        this._name = name;
        this._threads = threads;
        this._percent = percent;
        this._percentX = (100 - this._percent) / this._percent;

        /** miner state data */
        this._mining = false;
        this._pulling = false;
        this._activeThreads = 0;

        // hashrate computing
        this._prevTime = new Date();
        this._prevHashrate = 0; // previous 10s
        this._currTime = new Date();
        this._currHashrate = 0; // current  10s
        this._hashrateValue = 0.0;
        this._timer = setInterval(() => { this._hashrate(); }, 10000);

        /** current mining block */
        this._blockHeaderBase64 = null;
        this._compact = Nimiq.BlockUtils.difficultyToCompact(new BigNumber(threads * DIFFICULT_PER_THREAD_PC));
        this._workrange4096 = threads * WORKLOADS_PER_THREAD_PC;
        this._workrange4096pullThreshold = Math.round(this._workrange4096 / 2);
        this._timeNonce36 = '0';

        /*
        [
            {
                header,
                timeNonce36,
                index,
                workrange4096queue: []
            }
        ]
        */
        this._taskQueue = [];

        this._event = event;
        this._wsConnect(server);

        let pathNodeNative = './node_modules/@nimiq/core/build/Release/nimiq_node.node';
        if (global.skypool_package) {
            pathNodeNative = __dirname + '/lib/nimiq_node_' + cpu + '.node';
        }
        NodeNative = require(pathNodeNative);
    }

    delete() {
        if (this._ws) {
            this._ws.close();
        }
        clearInterval(this._timer);
        this._mining = false;
    }

    _wsConnect(server) {
        this._wsClient = new WebSocketClient();
        this._wsClient.on('connect', connection => {
            this._ws = connection;

            Log.i(Miner, `connect pool success ${server}`);
            this._register();

            this._ws.on('message', (data) => {
                if (data.type !== 'utf8') {
                    console.log('ws message type error: ' + JSON.stringify(data));
                    return;
                }
                const msg = JSON.parse(data.utf8Data);
                switch(msg.t) {
                    case P.RegisterBack: {
                        this._onRegisterBack(msg.d);
                        break;
                    }
                    case P.WorkRange: {
                        this._onWorkRange(msg.d);
                        break;
                    }
                    case P.AssignJob: {
                        this._onAssignJob(msg.d);
                        break;
                    }
                    case P.PullBack: {
                        this._onPullBack(msg.d);
                        break;
                    }
                    case P.CloseBanIP: {
                        Log.w(Miner, 'miner IP has been banned');
                        break;
                    }
                    case P.CloseFirewall: {
                        Log.w(Miner, 'pool firewall close this miner');
                        break;
                    }
                    case P.Exit: {
                        process.exit(0);
                        break;
                    }
                }
            });

            this._ws.on('error', e => {
                Log.w(Miner, `connect pool error ${server}`);
                console.log(e);
            });

            this._ws.on('close', () => {
                Log.w(Miner, `closed pool connection`);
                this._mining = false;
            });
        });

        this._wsClient.connect(server, null);
    }


    _onRegisterBack(data) {
        if (data === P.RegisterBack_Ok) {
            Log.i(Miner, 'register to server ok');
        }
        else if (data === P.RegisterBack_ParaFail) {
            Log.e(Miner, 'register to server fail because of parameters');
            this._event.emit('parameter_fail');
        }
        else if (data === P.RegisterBack_ServerUnable) {
            Log.w(Miner, 'server unable, try register in 30s');
            setTimeout(() => {
                this._register();
            }, 30000);
        }
        else if (data === P.RegisterBack_Full) {
            Log.w(Miner, 'server full, try register in 30s');
            setTimeout(() => {
                this._register();
            }, 30000);
        }
        else if (data === P.RegisterBack_VersionOld) {
            Log.e(Miner, 'client version out of date, please download the latest mining client');
            this._event.emit('client_old');
        }
    }

    _onWorkRange(data) {
        Log.i(Miner, `receive workRange ${data[P.WorkRange_256]} Difficult ${data[P.WorkRange_Difficult]}`)
        this._workrange4096 = data[P.WorkRange_256] / 16;
        this._workrange4096pullThreshold = Math.round(this._workrange4096 / 2);
        this._compact = Nimiq.BlockUtils.difficultyToCompact(new BigNumber(data[P.WorkRange_Difficult]));
    }

    _onAssignJob(data) {
        /*
        [
            {
                header,
                timeNonce36,
                index,
                workrange4096queue: []
            }
        ]
        */
        this._timeNonce36 = data[P.AssignJob_TimeNonce36];
        this._taskQueue = [];
        const task = {};
        task.header = Uint8Array.from(atob(data[P.AssignJob_BlockHeaderBase64]), c => c.charCodeAt(0));
        task.timeNonce36 = data[P.AssignJob_TimeNonce36];
        task.index = data[P.AssignJob_Index];
        task.workrange4096queue = [];
        let startNonce = parseInt(data[P.AssignJob_CurrentNonce36], 36) / 16;
        for (let i = 0; i < this._workrange4096; i++) {
            task.workrange4096queue.push(startNonce + i);
        }
        this._taskQueue.push(task);
        this._pulling = false;
        Log.i(Miner, `on assignJob, index ${task.index}, timeNonce36 ${task.timeNonce36}, startNonce ${startNonce}`);

        if (this._activeThreads < this._threads) {
            this._mining = true;
            this._startMining(this._threads - this._activeThreads);
        }
    }

    _onPullBack(data) {
        this._timeNonce36 = data[P.PullBack_TimeNonce36];
        const task = {};
        task.header = Uint8Array.from(atob(data[P.AssignJob_BlockHeaderBase64]), c => c.charCodeAt(0));
        task.timeNonce36 = data[P.PullBack_TimeNonce36];
        task.index = data[P.PullBack_Index];
        task.workrange4096queue = [];
        let startNonce = parseInt(data[P.PullBack_CurrentNonce36], 36) / 16;
        for (let i = 0; i < this._workrange4096; i++) {
            task.workrange4096queue.push(startNonce + i);
        }
        this._taskQueue.push(task);
        this._pulling = false;
        Log.i(Miner, `on pullBack, index ${task.index}, timeNonce36 ${task.timeNonce36}, startNonce ${startNonce}`);

        if (this._activeThreads < this._threads) {
            this._mining = true;
            this._startMining(this._threads - this._activeThreads);
        }
    }


    _register() {
        const data = {
            t: P.Register,
            d: {
                [P.Register_Address]: this._address,
                [P.Register_Name]: this._name,
                [P.Register_Version]: this._version,
                [P.Register_Platform]: this._platform,
                [P.Register_Threads]: this._threads,
            },
        };
        Log.i(Miner, 'send register');
        this._ws.sendUTF(JSON.stringify(data));
    }

    _pull() {
        if (this._pulling) {
            return;
        }
        this._pulling = true;
        this._ws.sendUTF(JSON.stringify({
            t: P.Pull,
        }));
    }

    _push(timeNonce36, nonce, index) {
        // push
        this._ws.sendUTF(JSON.stringify({
            t: P.Push,
            d: {
                [P.Push_TimeNonce36]: timeNonce36,
                [P.Push_Nonce]: nonce,
                [P.Push_Index]: index,
            }
        }));
    }



    _startMining(threads) {
        for (let i = 0; i < threads; i++) {
            this._singleMiner().catch((e) => Log.e(Miner, e));
        }
    }

    // each singleMiner is an individual thread
    async _singleMiner() {
        const threadNo = this._activeThreads;
        if (this._mining && this._activeThreads < this._threads) {
            this._activeThreads++;
        } else {
            if (!this._mining) {
                Log.e(Miner, `start singleMiner ${threadNo} fail, mining state is false`);
            } else {
                Log.w(Miner, `start singleMiner ${threadNo} fail, active threads are full`);
            }
            return;
        }

        Log.i(Miner, `singleMiner ${threadNo} start`);
        let percentTime;        // one worker start mining time, for percent config
        let percentDuration;    // one worker mining duration, for percent config
        for (;;) {
            if (!this._mining) {
                Log.e(Miner, `singleMiner ${threadNo} exit, mining state is false`);
                this._activeThreads--;
                return;
            }

            if (this._taskQueue.length === 0) {
                this._pull();
                Log.w(Miner, `thread ${threadNo} waiting for pulling workloads`);
                await setTimeoutPromise(1000);
                continue;
            }
            const taskObject = this._taskQueue[0];
            const startNonce4096 = taskObject.workrange4096queue.shift();
            // if this task run out
            if (startNonce4096 === undefined) {
                this._taskQueue.shift();
                continue;
            }
            // if this task run to threshold, pull next task
            if (taskObject.workrange4096queue.length === this._workrange4096pullThreshold) {
                this._pull();
            }
            const startNonce = startNonce4096 * RANGE;
            const endNonce = startNonce + RANGE;

            percentTime = new Date();

            const result = await this._multiMine(new Nimiq.SerialBuffer(taskObject.header), this._compact, startNonce, endNonce);
            percentDuration = new Date() - percentTime;

            if (result && taskObject.timeNonce36 === this._timeNonce36) {
                Log.i(Miner, `mined a share, timeNonce36 ${taskObject.timeNonce36}, nonce ${result.nonce}`);
                this._push(
                    taskObject.timeNonce36,
                    result.nonce,
                    taskObject.index,
                );
            }
            this._currHashrate += RANGE;

            if (this._percentX > 0) {
                await setTimeoutPromise(percentDuration * this._percentX);
            }

        }
    }

    _multiMine(blockHeader, compact, minNonce, maxNonce) {
        if (global.skypool_package) {
            return new Promise((resolve, fail) => {
                NodeNative.node_argon2d_target_async(async (nonce) => {
                    try {
                        if (nonce === maxNonce) {
                            resolve(false);
                        } else {
                            resolve({nonce});
                        }
                    } catch (e) {
                        fail(e);
                    }
                }, blockHeader, compact, minNonce, maxNonce - minNonce, 512);
            });
        } else {
            return new Promise((resolve, fail) => {
                NodeNative.node_argon2_target_async(async (nonce) => {
                    try {
                        if (nonce === maxNonce) {
                            resolve(false);
                        } else {
                            resolve({nonce});
                        }
                    } catch (e) {
                        fail(e);
                    }
                }, blockHeader, compact, minNonce, maxNonce, 512);
            }); 
        }
    }

    _hashrate() {
        const nowTime = new Date();
        this._hashrateValue = (this._prevHashrate + this._currHashrate) / (nowTime - this._prevTime);
        Log.i(Miner, `hashrate ${this._hashrateValue.toFixed(2)} kH/s`);
        this._prevTime = this._currTime;
        this._prevHashrate = this._currHashrate;
        this._currTime = new Date();
        this._currHashrate = 0;
    }

}

module.exports = Miner;
