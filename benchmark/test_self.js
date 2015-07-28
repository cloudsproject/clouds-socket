/**
 * clouds-controller bencmark
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var async = require('async');
var socket = require('../');
var config = require('./config');
var support = require('../test/support');


function test (num, msg, callback) {
  var timestamp = Date.now();

  var s = socket.createServer({
    host: config.host,
    port: config.port
  });
  s.on('listening', start);
  s.on('connection', function (c) {
    c.on('data', function (d) {
      c.send(d);
    });
  });

  var c = socket.createClient({
    host: config.host,
    port: config.port
  });

  function start () {
    var counter = 0;
    c.on('data', function (d) {
      if (d.toString() !== msg) {
        throw new Error(d.toString());
      }
      counter++;
      if (counter >= num) {
        done();
      }
    });
    for (var i = 0; i < num; i++) {
      c.send(msg);
    }
  }

  function done () {
    config.exit(c, s, function () {
      callback(Date.now() - timestamp);
    });
  }
}


function testAvg (num, fn, callback) {
  callback = callback || function () {
    process.exit();
  };
  var sum = 0;
  var count = 0;
  async.timesSeries(num, function (i, next) {
    fn(function (spent) {
      sum += spent;
      count++;
      console.log('spent %sms', spent);
      next();
    });
  }, function (err) {
    console.log('avg %sms', (sum / count).toFixed(0));
    console.log('---------------------------');
    callback(err);
  });
}

var TIMES = 5;
var COUNT = 10000;
async.series([
  function (next) {
    testAvg(TIMES, function (next) {
      test(COUNT, support.randomString(1), next);
    }, next);
  },
  function (next) {
    testAvg(TIMES, function (next) {
      test(COUNT, support.randomString(4), next);
    }, next);
  },
  function (next) {
    testAvg(TIMES, function (next) {
      test(COUNT, support.randomString(64), next);
    }, next);
  },
  function (next) {
    testAvg(TIMES, function (next) {
      test(COUNT, support.randomString(256), next);
    }, next);
  },
  function (next) {
    testAvg(TIMES, function (next) {
      test(COUNT, support.randomString(1024), next);
    }, next);
  },
  function (next) {
    testAvg(TIMES, function (next) {
      test(COUNT, support.randomString(1024 * 64), next);
    }, next);
  }
], function (err) {
  if (err) throw err;
  process.exit();
});
