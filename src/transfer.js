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
}

Transfer.prototype.receiveData = function (buf) {
  if (this._bufferNestLength > 0) {
    var allBuf = Buffer.concat(this._buffer, buf);
    var nestLength = this._bufferNestLength - buf.length;
    if (nestLength === 0) {
      this.process(allBuf);
      this.startReceiving();
    } else if (nestLength > 0) {
      this._buffer = allBuf;
      this._bufferNestLength = nestLength;
    } else {
      var newBuf = allBuf.slice(0, nestLength);
      this.pause();
      this.process(newBuf);
      var self = this;
      process.nextTick(function () {
        self.receiveData(allBuf.slice(newBuf.length));
      });
    }
  } else {
    var info = common.unpackBuffer(buf);
    if (info.nestLength > 0) {
      this._buffer = buf;
      this._bufferNestLength = info.nestLength;
    } else {
      this.process(info.buffer);
      this.startReceiving();
    }
  }
};

Transfer.prototype.sendData = function (buf) {
  this._socket.write(common.packBuffer(buf));
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
  this._bufferNestLength = 0;
  this._socket.resume();
};


Transfer.create = function (socket) {
  return new Transfer(socket);
};

module.exports = Transfer;
