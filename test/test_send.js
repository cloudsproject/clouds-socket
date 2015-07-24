/**
 * clouds-controller
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var support = require('./support');


describe('clouds-socket', function () {

  it('send simple data', function (done) {
    var host = support.getHost();
    var port = support.getPort();
    var s, c1, c2;

    var msg1 = support.utils.randomString(20);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.utils.randomString(20);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer({port: port, host: host});
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('connection', function (c) {
          c.on('data', function (d) {
            serverData.push(d);
          });
          c.send(msgBuf1);
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient({port: port, host: host});
        c1.on('connect', function () {
          c1.send(msgBuf2, next);
        });
        c1.on('data', function (d) {
          clientData.push(d);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createClient({port: port, host: host});
        c2.on('connect', function () {
          c2.send(msgBuf2);
          c2.send(msgBuf2, next);
        });
        c2.on('data', function (d) {
          clientData.push(d);
        });
      },
      support.wait(100),
      function (next) {
        // 检查数据
        serverData.length.should.equal(3);
        clientData.length.should.equal(2);
        serverData.forEach(function (d) {
          d.length.should.equal(msgBuf2.length);
          d.toString().should.equal(msg2);
        });
        clientData.forEach(function (d) {
          d.length.should.equal(msgBuf1.length);
          d.toString().should.equal(msg1);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

  it('send big data', function (done) {
    var host = support.getHost();
    var port = support.getPort();
    var s, c1;

    var len = 65536 * 10;
    var msg1 = support.randomString(len);
    console.log(msg1.length);
    var msgBuf1 = new Buffer(msg1);
    console.log(msgBuf1.length);
    var msg2 = support.randomString(len);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer({port: port, host: host});
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('connection', function (c) {
          c.on('data', function (d) {
            serverData.push(d);
          });
          c.send(msgBuf1);
          c.send(msgBuf1);
          c.send(msgBuf1);
          c.send(msgBuf1);
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient({port: port, host: host});
        c1.on('connect', function () {
          c1.send(msgBuf2);
          c1.send(msgBuf2);
          c1.send(msgBuf2);
          c1.send(msgBuf2);
          c1.send(msgBuf2);
          c1.send(msgBuf2, next);
        });
        c1.on('data', function (d) {
          clientData.push(d);
        });
      },
      support.wait(100),
      function (next) {
        // 检查数据
        serverData.length.should.equal(6);
        clientData.length.should.equal(4);
        serverData.forEach(function (d) {
          d.length.should.equal(msgBuf2.length);
          d.toString().should.equal(msg2);
        });
        clientData.forEach(function (d) {
          d.length.should.equal(msgBuf1.length);
          d.toString().should.equal(msg1);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, s, next);
      }
    ], done);
  });

});
