/**
 * clouds-socket test
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var support = require('./support');


describe('clouds-socket', function () {

  it('ping', function (done) {
    var address = support.getListenAddress();
    var s, c1, c2;

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
          c.ping(function (err, delay) {
            assert.equal(err, null);
            serverData.push(delay);
          });
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient(address);
        c1.on('connect', function () {
          c1.ping(function (err, delay) {
            clientData.push(delay);
            next(err);
          });
        });
      },
      function (next) {
        // 客户端连接
        c2 = support.createClient(address);
        c2.on('connect', function () {
          c2.ping(function (err, delay) {
            clientData.push(delay);
            next(err);
          });
        });
      },
      function (next) {
        c2.ping(function (err, delay) {
          clientData.push(delay);
          next(err);
        });
      },
      support.wait(200),
      function (next) {
        // 检查数据
        assert.equal(serverData.length, 2);
        assert.equal(clientData.length, 3);
        serverData.forEach(function (d) {
          assert.ok(d >= 0);
        });
        clientData.forEach(function (d) {
          assert.ok(d >= 0);
        });
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

});
