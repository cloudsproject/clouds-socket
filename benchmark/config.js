/**
 * clouds-controller bencmark
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var async = require('async');

exports.host = '127.0.0.1';

exports.port = 7001;

exports.exit = function () {
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();
  async.eachSeries(args, function (client, next) {
    client.exit(next);
  }, callback);
};
