# clouds-socket

## 安装

```bash
$ npm install clouds-socket --save
```


## 使用

### 服务端（TCP/Unix domain）

```javascript
var socket = require('clouds-socket');

// 创建服务端实例
var server = socket.createServer({
  // TCP连接
  host: '127.0.0.1',
  port: 7001
  // UNIX domain 连接
  // path: '/tmp/clouds.sock'
});

// 当有新客户端连接时，触发connection事件
server.on('connection', function (client) {
  // 用法与下文的「客户端」相同
});

// 当发生错误时触发error事件
server.on('error', function (err) {
  console.error(err);
});

// 当退出服务端时触发exit事件
server.on('exit', function () {
  console.log('server closed');
});

// 关闭服务器
server.exit();
```

### 客户端（TCP/Unix domain）

```javascript
var socket = require('clouds-socket');

// 创建客户端实例
var client = socket.createClient({
  // TCP连接
  host: '127.0.0.1',
  port: 7001
  // UNIX domain 连接
  // path: '/tmp/clouds.sock'
});

// 当连接成功时触发connect事件
// 如果服务器端断开了连接，客户端会自动重连
// 再次重连成功还是会触发connect事件
client.on('connect', function () {
  client.send('world');
  client.send(new Buffer('world'));
});

// 测试网络延时
client.ping(function (err, delay) {
  console.log('delay=%sms', delay);
});

// 当收到数据时，触发data事件
client.on('data', function (data) {
  console.log(data);
});

// 当发生错误时触发error事件
client.on('error', function (err) {
  console.error(err);
});

// 当退出服务端时触发exit事件
client.on('exit', function () {
  console.log('client closed');
});

// 关闭连接
client.exit();
```

*TODO 数据报文（UDP）：

```javascript
var socket = require('clouds-socket');

// 创建实例
var datagram = socket.createDatagram();

// 监听端口
datagram.listen({
  host: '127.0.0.1',
  port: 7001
});

// 发送数据
datagram.send('127.0.0.1', 7001, new Buffer('world'), callback);

// 当收到数据时，触发data事件
datagram.on('data', function (addr, data) {
  console.log('data from host=%s, port=%s', addr.host, addr.port);
  console.log(data);
});

// 当发生错误时触发error事件
datagram.on('error', function (err) {
  console.error(err);
});

// 当退出服务端时触发exit事件
datagram.on('exit', function () {
  console.log('exited');
});

// 关闭连接
datagram.exit();
```


## 测试代码覆盖率

94% coverage 238 SLOC


## 授权协议

MIT
