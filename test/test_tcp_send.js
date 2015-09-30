/**
 * clouds-socket test
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var support = require('./support');


describe('clouds-socket', function () {

  it('send simple data', function (done) {
    var address = support.getListenAddress();
    var s, c1, c2;

    var msg1 = support.randomString(20);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(20);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer(address);
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
        c1 = support.createClient(address);
        c1.on('connect', function () {
          c1.send(msgBuf2, next);
        });
        c1.on('data', function (d) {
          clientData.push(d);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createClient(address);
        c2.on('connect', function () {
          c2.send(msgBuf2);
          c2.send(msgBuf2, next);
        });
        c2.on('data', function (d) {
          clientData.push(d);
        });
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 3);
        assert.equal(clientData.length, 2);
        serverData.forEach(function (d) {
          assert.equal(d.length, msgBuf2.length);
          assert.equal(d.toString(), msg2);
        });
        clientData.forEach(function (d) {
          assert.equal(d.length, msgBuf1.length);
          assert.equal(d.toString(), msg1);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

  it('send simple data (string)', function (done) {
    var address = support.getListenAddress();
    var s, c1, c2;

    var msg1 = support.randomString(20);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(20);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer(address);
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('connection', function (c) {
          c.on('data', function (d) {
            serverData.push(d);
          });
          c.send(msg1);
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient(address);
        c1.on('connect', function () {
          c1.send(msg2, next);
        });
        c1.on('data', function (d) {
          clientData.push(d);
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createClient(address);
        c2.on('connect', function () {
          c2.send(msgBuf2);
          c2.send(msgBuf2, next);
        });
        c2.on('data', function (d) {
          clientData.push(d);
        });
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 3);
        assert.equal(clientData.length, 2);
        serverData.forEach(function (d) {
          assert.equal(d.length, msgBuf2.length);
          assert.equal(d.toString(), msg2);
        });
        clientData.forEach(function (d) {
          assert.equal(d.length, msgBuf1.length);
          assert.equal(d.toString(), msg1);
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
    var address = support.getListenAddress();
    var s, c1;

    var len = 65536 * 10;
    var msg1 = support.randomString(len);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(len);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer(address);
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
        c1 = support.createClient(address);
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
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 6);
        assert.equal(clientData.length, 4);
        serverData.forEach(function (d) {
          assert.equal(d.length, msgBuf2.length);
          assert.equal(d.toString(), msg2);
        });
        clientData.forEach(function (d) {
          assert.equal(d.length, msgBuf1.length);
          assert.equal(d.toString(), msg1);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, s, next);
      }
    ], done);
  });

  it('send data before connected', function (done) {
    var address = support.getListenAddress();
    var s, c1;

    var len = 655;
    var msg1 = support.randomString(len);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(len);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer(address);
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
        c1 = support.createClient(address);
        c1.on('connect', function () {
          c1.send(msgBuf2, next);
        });
        c1.on('data', function (d) {
          clientData.push(d);
        });
        c1.send(msgBuf2);
        c1.send(msgBuf2);
        c1.send(msgBuf2);
        c1.send(msgBuf2);
        c1.send(msgBuf2);
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 6);
        assert.equal(clientData.length, 4);
        serverData.forEach(function (d) {
          assert.equal(d.length, msgBuf2.length);
          assert.equal(d.toString(), msg2);
        });
        clientData.forEach(function (d) {
          assert.equal(d.length, msgBuf1.length);
          assert.equal(d.toString(), msg1);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, s, next);
      }
    ], done);
  });

  it('send small data many times', function (done) {
    var address = support.getListenAddress();
    var s, c1;

    var len = 10;
    var times = 10000;
    var msg1 = support.randomString(len);
    var msgBuf1 = new Buffer(msg1);
    var msg2 = support.randomString(len);
    var msgBuf2 = new Buffer(msg2);
    var serverData = [];
    var clientData = [];

    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer(address);
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('connection', function (c) {
          c.on('data', function (d) {
            serverData.push(d);
          });
          for (var i = 0; i < times; i++) {
            c.send(msgBuf1);
          }
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient(address);
        c1.on('connect', function () {
          var counter = 0;
          function callback (err) {
            assert.equal(err, null);
            counter++;
            if (counter >= times) {
              allDone(done1 = true);
            }
          }
          for (var i = 0; i < times; i++) {
            c1.send(msgBuf2, callback);
          }
        });
        c1.on('data', function (d) {
          clientData.push(d);
          if (clientData.length >= times) {
            allDone(done2 = true);
          }
        });

        var done1 = false;
        var done2 = false;
        function allDone () {
          if (done1 && done2) {
            next();
          }
        }
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, times);
        assert.equal(clientData.length, times);
        serverData.forEach(function (d) {
          assert.equal(d.length, msgBuf2.length);
          assert.equal(d.toString(), msg2);
        });
        clientData.forEach(function (d) {
          assert.equal(d.length, msgBuf1.length);
          assert.equal(d.toString(), msg1);
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
