/**
 * clouds-socket
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var createDebug = require('debug');
var common = module.exports = exports = require('lei-utils').extend(exports);


exports.debug = function (name) {
  return createDebug('clouds:socket:' + name);
};

var debug = exports.debug('common');


var DEFAULT = exports.default = {};
DEFAULT.reconnectWaiting = 500;


exports.reconnectWaiting = function () {
  return parseInt(Math.random() * exports.default.reconnectWaiting, 10);
};

exports.callback = function (fn) {
  if (fn) return fn;
  return function (err) {
    debug('unhandle callback: error=%s, results=%j', err, arguments);
  };
};

var BUFFER_LENGTH_BYTE_SIZE = 4;

exports.packBuffer = function (buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = new Buffer(buf.toString());
  }
  var len = buf.length;
  var newBuf = new Buffer(len + BUFFER_LENGTH_BYTE_SIZE);
  newBuf.writeUInt32BE(len, 0);
  buf.copy(newBuf, BUFFER_LENGTH_BYTE_SIZE);
  return newBuf;
};

exports.unpackBuffer = function (buf) {
  var len = buf.readUInt32BE(0);
  return {
    length: len,
    needLength: len - (buf.length - BUFFER_LENGTH_BYTE_SIZE),
    buffer: buf.slice(BUFFER_LENGTH_BYTE_SIZE, len + BUFFER_LENGTH_BYTE_SIZE),
    restBuffer: buf.slice(len + BUFFER_LENGTH_BYTE_SIZE)
  };
};
