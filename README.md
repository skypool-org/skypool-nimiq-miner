# Skypool Nimiq Miner

This is Nimiq mining client for [Skypool](https://nimiq.skypool.org).

Download Nimiq mining client in [release](https://github.com/skypool-org/skypool-nimiq-miner/releases).

Different version for different CPU instruction set
* extreme --> avx512f
* fast --> avx2
* normal --> avx
* compat --> non-avx

# Update Log

## 2018-04-13 version 1.0.0
* For Nimiq Mainnet !!!
* Optimizing network connection.
* `auto` server mode is more intelligent.
* Default thread `0` will automatic detecting CPU max thread number, and using MAX CPU threads minus 1 as thread.
* MacOS version now supports double click.
* Windows version add auto setting UV_THREADPOOL_SIZE environment variable script and backend mining script.

## 2018-03-16 version 0.0.2
* Support auto choice nearest pool node server, setting config field `server` to `auto`.
* Support CPU usage in percentage, setting config filed `percent` between 1 to 100.
* Friendly lint about connect failed.
* Update skypool nimiq miner protocol.
