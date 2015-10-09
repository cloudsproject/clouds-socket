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

var MAX_MESSAGE_LENGTH = 63 * 1024;
var MAX_MESSAGE_LENGTH = 10;
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
  var buffers = list.map(function (b) {
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

  return {list: list, buffers: buffers};
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
  self._options = options;

  var server = self._server = dgram.createSocket('udp4');

  self._sendBufferNumber = 0;
  self._sendBuffers = {};
  self._receviedBuffers = {};

  server.on('message', function (buf, addr) {
    var info = unpackMessage(buf);
    self._debug('received %d bytes from %s:%d, type=%s', buf.length, addr.address, addr.port, info.type);
    switch (info.type) {
      case PACK_TYPE_DATA:
        self._receivedMessage(info.buffer, addr);
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

    self._debug('check received buffer');
    common.objectForEach(self._receviedBuffers, function (key, list) {
      self._checkReceviedBuffer(key);
    });

    self._debug('check sent buffer');
    var timeout = Date.now() - self._options.bufferSentTimeout;
    common.objectForEach(self._sendBuffers, function (key, list) {
      var first = list[0];
      if (first.timestamp < timeout) {
        self._debug('cleam sent buffer: key=%s, timestamp=%s, buf=%s', key, first.timestamp, first.totalLength);
        delete self._sendBuffers[key];
      }
    });

  }, options.checkBufferInterval);

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

Datagram.prototype._receivedMessage = function (buf, addr) {
  var info = unpackDatagramBufferItem(buf);

  if (info.packageSize === 1) {
    this.emit('data', {host: addr.address, port: addr.port}, info.buffer);
    return;
  }

  var key = this._getBufferKey(addr.address, addr.port, info.number);
  if (!this._receviedBuffers[key]) this._receviedBuffers[key] = [];
  this._receviedBuffers[key][info.index] = info;
  this._checkReceviedBuffer(key);
};

Datagram.prototype._checkReceviedBuffer = function (key) {
  this._debug('_checkReceviedBuffer: key=%s', key);
  var first = this._receviedBuffers[key] && this._receviedBuffers[key][0];
  if (!first) return;

  var count = 0;
  var timeout = Date.now() - this._options.bufferReceviedTimeout;
  var needReSend = (first.timestamp < timeout);

  for (var i = 0; i < this._receviedBuffers[key].length; i++) {
    if (this._receviedBuffers[key][i]) {
      count++;
    } else {
      if (needReSend) {
        this._debug('_checkReceviedBuffer: need resend: key=%s, index=%s', key, i);
      }
    }
  }

  if (count === first.packageSize) {
    var buf = concatDatagramPackages(this._receviedBuffers[key]);
    delete this._receviedBuffers[key];
    this.emit('data', this._getAddrFromBufferKey(key), buf);
  }
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

Datagram.prototype.send = function (host, port, buf, callback) {
  var self = this;
  self._debug('send: host=%s, port=%s, buf=%s', host, port, buf.length);

  var num = self._sendBufferNumber++;
  var data = packDatagramBuffer(num, buf);
  var key = self._getBufferKey(host, port, num);
  self._sendBuffers[key] = data.list;

  async.eachSeries(data.buffers, function (b, next) {
    var buf = packMessage(b, PACK_TYPE_DATA);
    self._server.send(buf, 0, buf.length, port, host, next);
  }, common.callback(callback));
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



var a = new Datagram();
var b = new Datagram();
a.listen({host: '127.0.0.1', port: 7001});
b.listen({host: '127.0.0.1', port: 7002});
a.on('listening', function () {
  b.send('127.0.0.1', 7001, 'abcdefg', console.log);
  b.send('127.0.0.1', 7001, '66666667777778888888', console.log);
});
a.on('data', function (addr, data) {
  console.log('data from host=%s, port=%s', addr.host, addr.port);
  console.log(data, data.toString());
  //console.log(a);
  //console.log(b);
  //process.exit();
});
setTimeout(function () {
  console.log(b);
  process.exit();
}, 8000);
