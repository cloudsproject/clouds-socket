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


exports.getEnvDefaultValue = function (name, defaultValue) {
  return process.env['CLOUDS_DEFAULT_' + name] || defaultValue;
};

var DEFAULT = exports.default = {};

DEFAULT.RECONNECT_WAITING = parseInt(common.getEnvDefaultValue('RECONNECT_WAITING', 500), 10);

// 576 is the largest safe UDP packet size
DEFAULT.MAX_UDP_MESSAGE_SIZE = parseInt(common.getEnvDefaultValue('UDP_MESSAGE_SIZE', 576), 10);

DEFAULT.BUFFER_LENGTH_BYTE_SIZE = 4;
DEFAULT.PACK_TYPE_BYTE_SIZE = 1;
DEFAULT.PACK_TYPE_DATA = 0;
DEFAULT.PACK_TYPE_PING = 1;
DEFAULT.PACK_TYPE_PONG = 2;


exports.reconnectWaiting = function () {
  return DEFAULT.RECONNECT_WAITING;
};

exports.callback = function (fn) {
  if (fn) return fn;
  return function (err) {
    debug('unhandle callback: error=%s, results=%j', err, arguments);
  };
};


exports.packBuffer = function (buf, type) {
  if (!Buffer.isBuffer(buf)) {
    buf = new Buffer(buf.toString());
  }
  type = type || DEFAULT.PACK_TYPE_DATA;
  var len = buf.length;
  var newBuf = new Buffer(len + DEFAULT.BUFFER_LENGTH_BYTE_SIZE + DEFAULT.PACK_TYPE_BYTE_SIZE);
  newBuf.writeUInt8(type, 0);
  newBuf.writeUInt32BE(len, DEFAULT.PACK_TYPE_BYTE_SIZE);
  buf.copy(newBuf, DEFAULT.PACK_TYPE_BYTE_SIZE + DEFAULT.BUFFER_LENGTH_BYTE_SIZE);
  return newBuf;
};

exports.unpackBuffer = function (buf) {
  var len = buf.readUInt32BE(DEFAULT.PACK_TYPE_BYTE_SIZE);
  return {
    type: buf.readUInt8(0),
    length: len,
    needLength: len - (buf.length - DEFAULT.BUFFER_LENGTH_BYTE_SIZE - DEFAULT.PACK_TYPE_BYTE_SIZE),
    buffer: buf.slice(DEFAULT.PACK_TYPE_BYTE_SIZE + DEFAULT.BUFFER_LENGTH_BYTE_SIZE, len + DEFAULT.PACK_TYPE_BYTE_SIZE + DEFAULT.BUFFER_LENGTH_BYTE_SIZE),
    restBuffer: buf.slice(len + DEFAULT.PACK_TYPE_BYTE_SIZE + DEFAULT.BUFFER_LENGTH_BYTE_SIZE)
  };
};

exports.unpackSingleBuffer = function (buf) {
  return {
    type: DEFAULT.PACK_TYPE_DATA,
    length: buf.length,
    needLength: 0,
    buffer: buf,
    restBuffer: new Buffer(0)
  };
};

exports.objectForEach = function (obj, fn) {
  Object.keys(obj).forEach(function (k) {
    fn(k, obj[k]);
  });
};

