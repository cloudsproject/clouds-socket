/**
 * clouds-socket
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var assert = require('assert');
var dgram = require('dgram');
var common = require('./common');
var Transfer = require('./transfer');
var debug = common.debug('datagram');

//------------------------------------------------------------------------------
var MAX_MESSAGE_LENGTH = 63 * 1024;

function packDatagramBuffer (num, buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = new Buffer(buf.toString());
  }
  var list = [];
  var i = 0;
  for (var j = 0; j = i + MAX_MESSAGE_LENGTH; i = j) {
    var b = buf.slice(i, j);
    if (b.length > 0) {
      list.push(b);
    } else {
      break;
    }
  }
  var timestamp = Date.now();
  var offset = 0;
  list = list.map(function (b, i) {
    var item = {
      timestamp: timestamp,
      number: num,
      packageSize: list.length,
      index: i,
      totalLength: buf.length,
      length: b.length,
      offset: offset,
      buffer: b
    };
    offset += b.length;
    return item;
  });
  list = list.map(function (b) {
    var buf = new Buffer(24 + b.length);
    buf.writeUIntBE(b.timestamp, 0, 6);     // 6B
    buf.writeUInt32BE(b.number, 6);         // 4B
    buf.writeUInt16BE(b.packageSize, 10);   // 2B
    buf.writeUInt16BE(b.index, 12);         // 2B
    buf.writeUInt32BE(b.totalLength, 14);   // 4B
    buf.writeUInt16BE(b.length, 18);        // 2B
    buf.writeUInt32BE(b.offset, 20);        // 4B
    b.buffer.copy(buf, 24);                 // 4B
    return buf;
  });
  return list;
}

function unpackDatagramBufferList (list) {
  return list.map(function (buf) {
    return unpackDatagramBufferItem(buf);
  });
}

function unpackDatagramBufferItem (buf) {
  return {
    timestamp: buf.readUIntBE(0, 6),
    number: buf.readUInt32BE(6),
    packageSize: buf.readUInt16BE(10),
    index: buf.readUInt16BE(12),
    totalLength: buf.readUInt32BE(14),
    length: buf.readUInt16BE(18),
    offset: buf.readUInt32BE(20),
    buffer: buf.slice(24)
  };
}

function concatDatagramPackages (list) {
  if (list.length < 1) return null;
  list = list.map(function (p) {
    return Buffer.isBuffer(p) ? unpackDatagramBufferItem(p) : p;
  });
  list.sort(function (a, b) {
    return a.index - b.index;
  });
  var first = list[0];
  list.forEach(function (item, i) {
    assert(first.number === item.number, '[#' + i + '] invalid field `number`');
    assert(first.packageSize === item.packageSize, '[#' + i + '] invalid field `number`');
    assert(first.totalLength === item.totalLength, '[#' + i + '] invalid field `number`');
  });
  var buf = new Buffer(first.totalLength);
  list.forEach(function (b) {
    b.buffer.copy(buf, b.offset);
  });
  return buf;
}


/*
var data = common.randomString(1024 * 1024);
console.log(data.length);
var packages = packDatagramBuffer(1, data);
console.log(packages);
var list = unpackDatagramBufferList(packages);
console.log(list);
var buf = concatDatagramPackages(list);
console.log(buf.length);
assert(data, buf.toString());
*/

//------------------------------------------------------------------------------

/**
 * create client
 *
 * @param  {Object} options
 *   - {String} host
 *   - {Number} port
 * @return {Socket}
 */
function Datagram (options) {
  Datagram._counter++;
  this._debug = common.debug('client:#' + Datagram._counter);

  options = options || {};
  this._options = options;

  var server = this._server = dgram.createSocket('udp4');
  var self = this;

  server.on('message', function (msg, rinfo) {
    self._debug('received %d bytes from %s:%d', msg.length, rinfo.address, rinfo.port);
    self._receivedMessage(msg, rinfo);
  });
  server.on('listening', function () {
    self._listening = true;
    self._debug('listening: host=%s, port=%s', self._options.host, self._options.port);
    self.emit('listening');
  });
  server.on('error', function (err) {
    server._debug('on error: err=%s', err);
    self.emit('error', err);
  });
  server.on('close', function () {
    self._debug('server closed');
    self.emit('exit');
  });

  this._exited = false;
  this._connect();
}

common.inheritsEventEmitter(Datagram);

Datagram._counter = 0;

Datagram.prototype._receivedMessage = function (msg, rinfo) {

};

Datagram.prototype.listen = function (options, callback) {
  options = options || {};
  this._options = options = common.merge(this._options, options);
  assert(options.host, 'missing parameter `host`');
  assert(options.port, 'missing parameter `port`');
  this._listenOptions = options;

  this._debug('listen: host=%s, port=%s', options.host, options.port);
  this._server.bind({
    address: options.host,
    port: options.port
  }, common.callback(callback));
};

Datagram.prototype.ping = function (callback) {

};

Datagram.prototype.send = function (buf, callback) {
  
};

Datagram.prototype.exit = function (callback) {
  this._debug('exit');
  this._exited = true;
  this._socket.once('close', common.callback(callback));
  this._socket.destroy();
};


Datagram.create = function (options) {
  return new Datagram(options);
};

module.exports = Datagram;
