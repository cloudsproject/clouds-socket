/**
 * clouds-controller
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var socket = require('../');


global.should = should;
global.async = async;

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
