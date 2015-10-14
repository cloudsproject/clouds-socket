/**
 * clouds-socket
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var net = require('net');
var common = require('./common');
var debug = common.debug('transfer');

//------------------------------------------------------------------------------

function Transfer (socket, debug) {
  var self = this;
  self._socket = socket;
  self._debug = debug;
  socket.on('data', function (buf) {
    self.receiveData(buf, true);
  });
  self._ended = false;
  socket.once('end', function () {
    self._debug('socket closed');
    self._ended = false;
  });
  self.startReceiving();
}

common.inheritsEventEmitter(Transfer);

Transfer.prototype.receiveData = function (buf, isNewReceiving) {
  var self = this;
  self._debug('transfer: receiveData: buffer=%s, isNewReceiving=%s, cache.buffer=%s, cache.needLength=%s',
    buf.length, !!isNewReceiving, self._buffer.length, self._bufferNeedLength);

  if (self._bufferNeedLength > 0) {

    var allBuf = Buffer.concat([self._buffer, buf]);
    var needLength = self._bufferNeedLength - buf.length;
    self._debug('transfer: _bufferNeedLength=%s, needLength=%s', self._bufferNeedLength, needLength);
    if (needLength === 0) {
      self._process(common.unpackSingleBuffer(allBuf));
      self.startReceiving();
    } else if (needLength > 0) {
      self._buffer = allBuf;
      self._bufferNeedLength = needLength;
      self.resume();
    } else {
      var newBuf = allBuf.slice(0, needLength);
      self.processDataNextTime(allBuf.slice(newBuf.length), '#1');
      self._process(common.unpackSingleBuffer(newBuf));
    }

  } else {

    buf = Buffer.concat([self._buffer, buf]);
    if (buf.length < 4) {
      self._buffer = buf;
      self.resume();
      return;
    }

    var info = common.unpackBuffer(buf);
    self._debug('transfer: type=%s, needLength=%s, restBuffer=%s', info.type, info.needLength, info.restBuffer.length);
    if (info.needLength > 0) {
      self._buffer = info.buffer;
      self._bufferNeedLength = info.needLength;
      self.resume();
    } else if (info.needLength < 0) {
      self.processDataNextTime(info.restBuffer, '#2');
      self._process(info);
    } else {
      self._process(info);
      self.startReceiving();
    }

  }
};

Transfer.prototype.ping = function (callback) {
  if (typeof callback !== 'function') throw new TypeError('the first argument must be a callback function');
  this._debug('transfer: ping');
  if (this._ended) return callback(new Error('socket has been ended'));
  var buf = Date.now().toString();
  var data = common.packBuffer(buf, common.default.PACK_TYPE_PING);
  this.once('pong', function (delay, timestamp) {
    callback(null, delay, timestamp);
  });
  this._socket.write(data);
};

Transfer.prototype.pong = function (timestamp) {
  this._debug('transfer: pong');
  if (this._ended) return callback(new Error('socket has been ended'));
  var buf = timestamp.toString();
  var data = common.packBuffer(buf, common.default.PACK_TYPE_PONG);
  this._socket.write(data);
};

Transfer.prototype.send = function (buf, callback) {
  this._debug('transfer: send: buffer=%s, callback=%s', buf.length, !!callback);
  if (this._ended) return callback(new Error('socket has been ended'));
  var data = common.packBuffer(buf, common.default.PACK_TYPE_DATA);
  if (callback) {
    this._socket.write(data, common.callback(callback));
  } else {
    this._socket.write(data);
  }
};

Transfer.prototype._process = function (info) {
  this._debug('transfer: process: type=%s, buffers=%s', info.type, info.length);
  switch (info.type) {
    case common.default.PACK_TYPE_DATA:
      this.emit('data', info.buffer);
      break;
    case common.default.PACK_TYPE_PING:
      this.pong(info.buffer.toString());
      this.emit('ping', Number(info.buffer.toString()))
      break;
    case common.default.PACK_TYPE_PONG:
      this._emitPong(info.buffer.toString());
      break;
    default:
      this._debug('transfer: unknown type=%s', info.type);
  }
};

Transfer.prototype._emitPong = function (timestamp) {
  timestamp = Number(timestamp);
  var delay = Date.now() - timestamp;
  if (!(delay >= 0)) delay = -1;
  this.emit('pong', delay, timestamp);
};

Transfer.prototype.process = function () {
  throw new Error('please set a process handle for Transfer instance');
};

Transfer.prototype.resume = function () {
  this._debug('transfer: resume');
  this._paused = false;
  this._socket.resume();
};

Transfer.prototype.pause = function (reason) {
  this._debug('transfer: pause, reason=%s', reason);
  this._paused = true;
  this._socket.pause();
};

Transfer.prototype.startReceiving = function () {
  this._debug('transfer: startReceiving');
  this._buffer = new Buffer(0);
  this._bufferNeedLength = 0;
  this.resume();
};

Transfer.prototype.processDataNextTime = function (buf, reason) {
  var self = this;
  self._debug('processDataNextTime: buffer=%s, reason=%s', buf.length, reason);
  self._bufferNeedLength = 0;
  self._buffer = new Buffer(0);
  self.pause(reason);
  process.nextTick(function () {
    self.receiveData(buf);
  });
};


Transfer.create = function (socket, debug) {
  return new Transfer(socket, debug);
};

module.exports = Transfer;
