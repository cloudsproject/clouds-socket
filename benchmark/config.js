/**
 * clouds-controller bencmark
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var os = require('os');
var path = require('path');
var async = require('async');


var basePort = 7001;
var unixDomainPath = path.resolve(os.tmpDir(), 'clouds-socket-' + Date.now() + '-');
var isUseUnixDomain = (process.env.TEST_USE_UNIX_DOMAIN == 'true');

exports.getListenAddress = function () {
  if (isUseUnixDomain) {
    return {path: unixDomainPath + (basePort++)};
  } else {
    return {port: basePort++, host: '127.0.0.1'};
  }
};

exports.exit = function () {
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();
  async.eachSeries(args, function (client, next) {
    client.exit(next);
  }, callback);
};
