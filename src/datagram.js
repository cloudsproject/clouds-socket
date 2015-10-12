/**
 * clouds-socket
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var assert = require('assert');
var dgram = require('dgram');
var async = require('async');
var common = require('./common');
var debug = common.debug('datagram');

//------------------------------------------------------------------------------
var PACK_TYPE_BYTE_SIZE = 1;
var PACK_TYPE_DATA = 0;
var PACK_TYPE_PING = 1;
var PACK_TYPE_PONG = 2;
var PACK_TYPE_DATA_RESEND = 3;

var MESSAGE_HEADER_SIZE = 25;
var MAX_UDP_MESSAGE_SIZE = 9216;
var CHECK_BUFFER_INTERVAL = 500;
var BUFFER_SENT_TIMEOUT = 5000;
var BUFFER_RECEVIED_TIMEOUT = 2000;

function packMessage (buf, type) {
  type = type || PACK_TYPE_DATA;
  var newBuf = new Buffer(buf.length + PACK_TYPE_BYTE_SIZE);
  newBuf.writeUInt8(type, 0);
  buf.copy(newBuf, PACK_TYPE_BYTE_SIZE);
  return newBuf;
}

function unpackMessage (buf) {
  return {
    type: buf.readUInt8(0),
    buffer: buf.slice(1)
  };
}

function packDatagramBuffer (num, buf, maxUDPMessageSize) {
  if (!Buffer.isBuffer(buf)) {
    buf = new Buffer(buf.toString());
  }
  var list = [];
  var i = 0;
  var maxSize = maxUDPMessageSize - MESSAGE_HEADER_SIZE;
  for (var j = 0; j = i + maxSize; i = j) {
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
  list.forEach(function (b) {
    var buf = new Buffer(24 + b.length);
    buf.writeUIntBE(b.timestamp, 0, 6);     // 6B
    buf.writeUInt32BE(b.number, 6);         // 4B
    buf.writeUInt16BE(b.packageSize, 10);   // 2B
    buf.writeUInt16BE(b.index, 12);         // 2B
    buf.writeUInt32BE(b.totalLength, 14);   // 4B
    buf.writeUInt16BE(b.length, 18);        // 2B
    buf.writeUInt32BE(b.offset, 20);        // 4B
    b.buffer.copy(buf, 24);                 // 4B
    b.send = buf;
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
    assert(first.number === item.number, 'package #' + i + ' invalid field `number`');
    assert(first.packageSize === item.packageSize, 'package #' + i + ' invalid field `number`');
    assert(first.totalLength === item.totalLength, 'package #' + i + ' invalid field `number`');
  });
  var buf = new Buffer(first.totalLength);
  list.forEach(function (b) {
    b.buffer.copy(buf, b.offset);
  });
  return buf;
}


function getArrayFirstExistItem (list) {
  for (var i = 0; i < list.length; i++) {
    if (list[i]) return list[i];
  }
}

function packMessageRequestReSendBuffer (number, index) {
  var b = new Buffer(6);
  b.writeUInt32BE(number, 0);
  b.writeUInt16BE(index, 4);
  return packMessage(b, PACK_TYPE_DATA_RESEND);
}

function unpackMessageRequestReSendBuffer (buf) {
  return {
    number: buf.readUInt32BE(0),
    index: buf.readUInt16BE(4)
  };
}

function packMessagePing (timestamp) {
  var buf = new Buffer(6);
  buf.writeUIntBE(timestamp, 0, 6);
  return packMessage(buf, PACK_TYPE_PING);
}

function unpackMessagePing (buf) {
  return buf.readUIntBE(0, 6);
}

function packMessagePong (timestamp) {
  var buf = new Buffer(6);
  buf.writeUIntBE(timestamp, 0, 6);
  return packMessage(buf, PACK_TYPE_PONG);
}

function unpackMessagePong (buf) {
  return buf.readUIntBE(0, 6);
}

//------------------------------------------------------------------------------

/**
 * create client
 *
 * @param  {Object} options
 *   - {String} host
 *   - {Number} port
 *   - {Number} checkBufferInterval
 *   - {Number} bufferSentTimeout
 *   - {Number} bufferReceviedTimeout
 *   - {Number} maxUDPMessageSize
 * @return {Socket}
 */
function Datagram (options) {
  var self = this;
  Datagram._counter++;
  self._debug = common.debug('client:#' + Datagram._counter);

  options = options || {};
  options.checkBufferInterval = options.checkBufferInterval || CHECK_BUFFER_INTERVAL;
  options.bufferSentTimeout = options.bufferSentTimeout || BUFFER_SENT_TIMEOUT;
  options.bufferReceviedTimeout = options.bufferReceviedTimeout || BUFFER_RECEVIED_TIMEOUT;
  options.maxUDPMessageSize = options.maxUDPMessageSize || MAX_UDP_MESSAGE_SIZE;
  self._options = options;

  var server = self._server = dgram.createSocket('udp4');

  self._sendBufferNumber = 0;
  self._sendBuffers = {};
  self._receviedBuffers = {};
  self._pingCallbacks = {};

  server.on('message', function (buf, addr) {
    var info = unpackMessage(buf);
    self._debug('received %d bytes from %s:%d, type=%s', buf.length, addr.address, addr.port, info.type);
    switch (info.type) {

      case PACK_TYPE_DATA:
        self._receivedMessage(info.buffer, addr);
        break;

      case PACK_TYPE_PING:
        self._receivedPing(info.buffer, addr);
        break;

      case PACK_TYPE_PONG:
        self._receivedPong(info.buffer, addr);
        break;

      case PACK_TYPE_DATA_RESEND:
        self._receivedDataReSendRequest(info.buffer, addr);
        break;

      default:
        self._debug('unknown message type: %s', info.type);
    }
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

  self._tidCheckBuffer = setInterval(function () {

    // self._debug('check received buffer');
    common.objectForEach(self._receviedBuffers, function (key, list) {
      self._checkReceviedBuffer(key, true);
    });

    // self._debug('check sent buffer');
    var timeout = Date.now() - self._options.bufferSentTimeout;
    common.objectForEach(self._sendBuffers, function (key, list) {
      var first = getArrayFirstExistItem(list);
      if (first.timestamp < timeout) {
        self._debug('clean sent buffer: key=%s, timestamp=%s, buf=%s', key, first.timestamp, first.totalLength);
        delete self._sendBuffers[key];
      }
    });

    // self._debug('clean ping callback');
    common.objectForEach(self._pingCallbacks, function (key, list) {
      if (list && list.length < 1) {
        self._debug('clean ping callbacks, key=%s', key);
        delete self._pingCallbacks[key];
        return;
      }
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (item.t < timeout) {
          list.splice(i, 1);
          i--;
          item.fn(new Error('timeout'));
        }
      }
    });

  }, options.checkBufferInterval);

  self.on('pong', function (addr, delay, timestamp) {
    var key = addr.host + ':' + addr.port;
    var list = self._pingCallbacks[key];
    if (!Array.isArray(list)) return;
    list.forEach(function (item) {
      item.fn(null, delay, timestamp);
    });
  });

  self._exited = false;
}

common.inheritsEventEmitter(Datagram);

Datagram._counter = 0;

Datagram.prototype._getBufferKey = function (host, port, num) {
  return host + ':' + port + ':' + num;
};

Datagram.prototype._getAddrFromBufferKey = function (key) {
  var s = key.split(':');
  return {host: s[0], port: Number(s[1])};
};

Datagram.prototype._getInfoFromBufferKey = function (key) {
  var s = key.split(':');
  return {host: s[0], port: Number(s[1]), number: Number(s[2])};
};

Datagram.prototype._receivedMessage = function (buf, addr) {
  var info = unpackDatagramBufferItem(buf);

  if (info.packageSize === 1) {
    this.emit('data', {host: addr.address, port: addr.port}, info.buffer);
    return;
  }

  var key = this._getBufferKey(addr.address, addr.port, info.number);
  if (!this._receviedBuffers[key]) this._receviedBuffers[key] = [];
  this._receviedBuffers[key][info.index] = info;
  this._checkReceviedBuffer(key, false);
};

Datagram.prototype._receivedDataReSendRequest = function (buf, addr) {
  var info = unpackMessageRequestReSendBuffer(buf);
  var key = this._getBufferKey(addr.address, addr.port, info.number);

  if (!this._sendBuffers[key]) {
    this._debug('_receivedDataReSendRequest: buffers not exists, key=%s', key);
    return;
  }

  var item = this._sendBuffers[key][info.index];
  if (!item) {
    this._debug('_receivedDataReSendRequest: buffers not exists, key=%s, index=%s', key, info.index);
    return;
  }

  this._debug('_receivedDataReSendRequest: send, key=%s, index=%s', key, info.index);
  var buf = packMessage(item.send, PACK_TYPE_DATA);
  this._server.send(buf, 0, buf.length, addr.port, addr.address);
};

Datagram.prototype._receivedPing = function (buf, addr) {
  var timestamp = unpackMessagePing(buf);
  this._debug('_receivedPing: timestamp=%s', timestamp);
  var buf = packMessagePong(timestamp);
  this._server.send(buf, 0, buf.length, addr.port, addr.address);
};

Datagram.prototype._receivedPong = function (buf, addr) {
  var timestamp = unpackMessagePong(buf);
  var delay = Date.now() - timestamp;
  this._debug('_receivedPong: delay=%s, timestamp=%s', delay, timestamp);
  this.emit('pong', {host: addr.address, port: addr.port}, delay, timestamp);
};

Datagram.prototype._checkReceviedBuffer = function (key, requestReSendImmediate) {
  this._debug('_checkReceviedBuffer: key=%s, requestReSendImmediate=%s', key, requestReSendImmediate);
  var one = getArrayFirstExistItem(this._receviedBuffers[key]);
  if (!one) return;

  var count = 0;
  var timeout = Date.now() - this._options.bufferReceviedTimeout;
  var needReSend = (one.timestamp < timeout);

  for (var i = 0; i < one.packageSize; i++) {
    if (this._receviedBuffers[key][i]) {
      count++;
    } else {
      if (requestReSendImmediate && needReSend) {
        this._debug('_checkReceviedBuffer: need resend: key=%s, index=%s', key, i);
        this._requestReSendBuffer(key, i);
      }
    }
  }

  if (count === one.packageSize) {
    var buf = concatDatagramPackages(this._receviedBuffers[key]);
    delete this._receviedBuffers[key];
    this.emit('data', this._getAddrFromBufferKey(key), buf);
  }
};

Datagram.prototype._requestReSendBuffer = function (key, index) {
  var info = this._getInfoFromBufferKey(key);
  var b = packMessageRequestReSendBuffer(info.number, index);
  this._server.send(b, 0, b.length, info.port, info.host);
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

Datagram.prototype.ping = function (host, port, callback) {
  var self = this;
  self._debug('ping');

  var key = host + ':' + port;
  callback = common.callback(callback);
  var cb = function () {
    var i = self._pingCallbacks[key] && self._pingCallbacks[key].indexOf(data);
    if (i !== -1) self._pingCallbacks[key].splice(i, 1);
    callback.apply(null, arguments);
  }
  var data = {t: Date.now(), fn: cb};
  if (!Array.isArray(self._pingCallbacks[key])) {
    self._pingCallbacks[key] = [data];
  } else {
    self._pingCallbacks[key].push(data);
  }

  var buf = packMessagePing(Date.now());
  self._server.send(buf, 0, buf.length, port, host);
};

Datagram.prototype.send = function (host, port, buf, callback) {
  var self = this;
  self._debug('send: host=%s, port=%s, buf=%s', host, port, buf.length);

  var num = self._sendBufferNumber++;
  var buffers = packDatagramBuffer(num, buf, self._options.maxUDPMessageSize);
  var key = self._getBufferKey(host, port, num);
  self._sendBuffers[key] = buffers;

  // if (buffers.length > 1) {
  //   self._debug('send: buf=%s, packageSize=%s', buf.length, buffers.length);
  // }

  async.eachSeries(buffers, function (b, next) {

    var buf = packMessage(b.send, PACK_TYPE_DATA);
    self._debug('send package: buf=%s', buf.length);
    self._server.send(buf, 0, buf.length, port, host, next);

  }, common.callback(callback));
};

Datagram.prototype.exit = function (callback) {
  this._debug('exit');
  this._exited = true;
  clearInterval(this._tidCheckBuffer);
  this._server.once('close', common.callback(callback));
  this._server.close();
};


Datagram.create = function (options) {
  return new Datagram(options);
};

module.exports = Datagram;
