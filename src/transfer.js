/**
 * clouds-controller
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var net = require('net');
var common = require('./common');
var debug = common.debug('transfer');

//------------------------------------------------------------------------------

function Transfer (socket) {
  var self = this;
  self._socket = socket;
  socket.on('data', function (buf) {
    self.receiveData(buf);
  });
  self.startReceiving();
}

Transfer.prototype.receiveData = function (buf) {
  var self = this;
  if (self._bufferNeedLength > 0) {
    var allBuf = Buffer.concat(self._buffer, buf);
    var needLength = self._bufferNeedLength - buf.length;
    if (needLength === 0) {
      self.process(allBuf);
      self.startReceiving();
    } else if (needLength > 0) {
      self._buffer = allBuf;
      self._bufferNeedLength = needLength;
    } else {
      var newBuf = allBuf.slice(0, needLength);
      self.pause();
      self.process(newBuf);
      process.nextTick(function () {
        self.receiveData(allBuf.slice(newBuf.length));
      });
    }
  } else {
    var info = common.unpackBuffer(buf);
    if (info.needLength > 0) {
      self._buffer = buf;
      self._bufferNeedLength = info.needLength;
    } else if (info.needLength < 0) {
      self.pause();
      self.process(info.buffer);
      process.nextTick(function () {
        self.receiveData(info.restBuffer);
      });
    } else {
      self.process(info.buffer);
      self.startReceiving();
    }
  }
};

Transfer.prototype.sendData = function (buf, callback) {
  if (callback) {
    this._socket.write(common.packBuffer(buf), common.callback(callback));
  } else {
    this._socket.write(common.packBuffer(buf));
  }
};

Transfer.prototype.process = function () {
  throw new Error('please set a process handle for Transfer instance');
};

Transfer.prototype.pause = function () {
  this._paused = true;
  this._socket.pause();
};

Transfer.prototype.startReceiving = function () {
  this._buffer = new Buffer(0);
  this._bufferNeedLength = 0;
  this._socket.resume();
};


Transfer.create = function (socket) {
  return new Transfer(socket);
};

module.exports = Transfer;
