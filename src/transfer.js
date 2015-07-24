/**
 * clouds-controller
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
  self.startReceiving();
}

Transfer.prototype.receiveData = function (buf, isNewReceiving) {
  var self = this;
  self._debug('transfer: receiveData: buffer=%s, isNewReceiving=%s, cache.buffer=%s, cache.needLength=%s',
    buf.length, !!isNewReceiving, self._buffer.length, self._bufferNeedLength);
  if (self._bufferNeedLength > 0) {

    var allBuf = Buffer.concat([self._buffer, buf]);
    var needLength = self._bufferNeedLength - buf.length;
    self._debug('transfer: _bufferNeedLength=%s, needLength=%s', self._bufferNeedLength, needLength);
    if (needLength === 0) {
      self._process(allBuf);
      self.startReceiving();
    } else if (needLength > 0) {
      self._buffer = allBuf;
      self._bufferNeedLength = needLength;
      self.resume();
    } else {
      var newBuf = allBuf.slice(0, needLength);
      self.processDataNextTime(allBuf.slice(newBuf.length), '#1');
      self._process(newBuf);
    }

  } else {

    var info = common.unpackBuffer(buf);
    self._debug('transfer: needLength=%s, restBuffer=%s', info.needLength, info.restBuffer.length);
    if (info.needLength > 0) {
      self._buffer = info.buffer;
      self._bufferNeedLength = info.needLength;
      self.resume();
    } else if (info.needLength < 0) {
      self.processDataNextTime(info.restBuffer, '#2');
      self._process(info.buffer);
    } else {
      self._process(info.buffer);
      self.startReceiving();
    }

  }
};

Transfer.prototype.sendData = function (buf, callback) {
  this._debug('transfer: sendData: buffer=%s, callback=%s', buf.length, !!callback);
  if (callback) {
    this._socket.write(common.packBuffer(buf), common.callback(callback));
  } else {
    this._socket.write(common.packBuffer(buf));
  }
};

Transfer.prototype._process = function (buf) {
  this._debug('transfer: process: buffer=%s', buf.length);
  this.process(buf);
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


Transfer.create = function (socket) {
  return new Transfer(socket);
};

module.exports = Transfer;
