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

### 数据报文（UDP）：

```javascript
var socket = require('clouds-socket');

// 创建实例
var datagram = socket.createDatagram({
  maxUDPMessageSize: 576, // UDP消息的最大长度，默认576
  checkBufferInterval: 500, // 垃圾回收检查周期，默认500ms
  bufferSentTimeout: 5000, // 发送数据超时时间，超过此时间后自动丢弃，默认5000ms
  bufferReceviedTimeout: 2000, // 接收数据超时时间，数据块超过此时间未接收到会请求重新发送，默认2000ms
});

// 监听端口
datagram.listen({
  host: '127.0.0.1', // 监听地址，可选
  port: 7001         // 监听端口，可选
});

// 发送数据
datagram.send('127.0.0.1', 7001, new Buffer('world'), callback);

// 测试网络延时
datagram.ping('127.0.0.1', 7001, function (err, delay) {
  console.log('delay=%sms', delay);
});

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

### 通过环境变量配置默认的值

```bash
# 设置单条UDP消息的最大长度，默认576
export CLOUDS_DEFAULT_UDP_MESSAGE_SIZE=8192

# 设置TCP连接被断开后，自动重连的等待时间，ms，默认500
export CLOUDS_DEFAULT_RECONNECT_WAITING=200
```


## 测试代码覆盖率

89% coverage 563 SLOC


## 授权协议

```
Copyright (c) 2012-2015 Zongmin Lei (雷宗民) <leizongmin@gmail.com>
http://ucdok.com

The MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

