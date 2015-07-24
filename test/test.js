/**
 * clouds-controller
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var support = require('./support');


describe('clouds-socket', function () {

  it('server.listen() & client.connect()', function (done) {
    var host = support.getHost();
    var port = support.getPort();
    var s, c1, c2;
    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer({port: port, host: host});
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient({port: port, host: host});
        c1.on('connect', next);
      },
      function (next) {
        // 客户端连接
        c2 = support.createClient({port: port, host: host});
        c2.on('connect', next);
      },
      function (next) {
        // 断开连接
        c1.exit(next);
      },
      function (next) {
        // 断开连接
        c2.exit(next);
      },
      function (next) {
        // 关闭服务器
        s.exit(next);
      }
    ], done);
  });

  it('server.listen() & client.connect() - event `exit`', function (done) {
    var host = support.getHost();
    var port = support.getPort();
    var s, c1, c2;
    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer({port: port, host: host});
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient({port: port, host: host});
        c1.on('connect', next);
      },
      function (next) {
        // 客户端连接
        c2 = support.createClient({port: port, host: host});
        c2.on('connect', next);
      },
      function (next) {
        // 断开连接
        c1.exit();
        c1.once('exit', next);
      },
      function (next) {
        // 断开连接
        c2.exit();
        c2.once('exit', next);
      },
      function (next) {
        // 关闭服务器
        s.exit();
        s.once('exit', next);
      }
    ], done);
  });

  it('server event `connection`', function (done) {
    var host = support.getHost();
    var port = support.getPort();
    var s, c1, c2;
    var counter = 0;
    async.series([
      function (next) {
        // 创建服务器
        s = support.createServer({port: port, host: host});
        s.on('listening', next);
        s.on('error', function (err) {
          throw err;
        });
        s.on('connection', function (client) {
          counter++;
        });
      },
      function (next) {
        // 客户端连接
        c1 = support.createClient({port: port, host: host});
        c1.on('connect', next);
      },
      function (next) {
        // 客户端连接
        c2 = support.createClient({port: port, host: host});
        c2.on('connect', next);
      },
      function (next) {
        // 检查计数器
        counter.should.equal(2);
        next();
      },
      function (next) {
        // 关闭服务器所有连接
        support.exit(c1, c2, s, next);
      }
    ], done);
  });

});
