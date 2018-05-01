const config = 
{
  address: "NQ48 8CKH BA24 2VR3 N249 N8MN J5XX 74DB 5XJ8",
  deviceId: 1,
  threads: 0,
  host: "sh0-nimiq.skypool.xyz",
  port: 8444,
  isNano: false,
}

/*
Host List:
sh0-nimiq.skypool.xyz
hk1-nimiq.skypool.xyz
eu1-nimiq.skypool.xyz
us2-nimiq.skypool.xyz
*/

/*
说明
address: 矿工钱包地址
deviceId: 矿机编号，只能是数字（范围 0 到 2147483647），用于网站查询矿机状态
threads: 挖矿线程数，0 表示自动设置为 CPU 线程数减1
host: 矿池节点地址
port: 矿池节点端口
isNano: 默认为 false，表示同步全部区块数据后开始挖矿，数据会保存在本地；设置为 true 会只同步最新区块数据。如果条件允许建议设置为 false 挖矿更稳定。
*/

/*
Description
address: 矿工钱包地址
deviceId: 矿机编号，只能是数字，用于网站查询矿机状态
threads: 挖矿线程数，0 表示自动设置为 CPU 线程数减1
host: 矿池节点地址
port: 矿池节点端口
isNano: 默认为 false，表示同步全部区块数据后开始挖矿，数据会保存在本地；设置为 true 会只同步最新区块数据。如果条件允许建议设置为 false 挖矿更稳定。
*/



/*
种子节点，加快区块数据同步速度
Seed peers, accelerate block data sync
*/
config.seedPeers = [
  {
    host: 'sh0-nimiq.skypool.xyz',
    port: 8443,
    publicKey: 'f78ad9efe9587683397b8ec2ce601c82cad13041c45cfced4e20fe42aee3c6cf',
  }, {
    host: 'hk1-nimiq.skypool.xyz',
    port: 8443,
    publicKey: '0581f2877f74da6e35828e5a265bdcd8b7ec4c0cc59c9faa3c87d586ec443c50',
  }, {
    host: 'eu1-nimiq.skypool.xyz',
    port: 8443,
    publicKey: 'd6c167556276f0de8a540c6ed3b93a2ce5bd0cf0631842dc6b35e915211201e0',
  }, {
    host: 'us2-nimiq.skypool.xyz',
    port: 8443,
    publicKey: 'dbbcdf8bb888f3e52a93baeaafeb2714474999df81094c982ad0945d6e0b1d22',
  },
]

module.exports = config;
