/**
 * clouds-controller test
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var assert = require('assert');
var async = require('async');
var utils = require('lei-utils');
var socket = require('../');


global.async = async;
global.assert = assert;

exports.utils = utils;

exports.createClient = function (options) {
  return socket.createClient(options);
};

exports.createServer = function (options) {
  return socket.createServer(options);
};

var basePort = 7001;

exports.getPort = function () {
  return basePort++;
};

exports.getHost = function () {
  return '127.0.0.1';
};

exports.exit = function () {
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();
  async.eachSeries(args, function (client, next) {
    client.exit(next);
  }, callback);
};

exports.wait = function (ms) {
  return function (next) {
    setTimeout(next, ms);
  };
};

exports.randomString = function (len) {
  var buf = new Buffer(len);
  for (var i = 0; i < len; i++) {
    var c = 96 + parseInt(Math.random() * 26, 10);
    buf[i] = c;
  }
  return buf.toString();
};
