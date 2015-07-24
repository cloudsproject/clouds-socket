/**
 * clouds-controller
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var assert = require('assert');
var net = require('net');
var common = require('./common');
var Transfer = require('./transfer');
var debug = common.debug('server');

//------------------------------------------------------------------------------

/**
 * create server
 * @param  {Object} options
 *   - {String} host
 *   - {Number} port
 * @return {Socket}
 */

function Server (options) {
  assert(options.host, 'missing parameter `host`');
  assert(options.port, 'missing parameter `port`');

  this._options = common.merge(options);
  Server._counter++;
  this._debug = common.debug('server:#' + Server._counter);

  this._listen();
}

common.inheritsEventEmitter(Server);

Server._counter = 0;


Server.prototype._listen = function () {
  var self = this;
  self._listening = false;
  self._exited = false;

  self._socket = new net.Server();

  self._socket.on('error', function (err) {
    self._debug('server error: host=%s, port=%s, error=%s', self._options.host, self._options.port, err);
    self.emit('error', err);
  });

  self._socket.once('close', function () {
    self._debug('server closed');
    self.emit('exit');
  });

  self._socket.on('listening', function () {
    self._listening = true;
    self._debug('listening: host=%s, port=%s', self._options.host, self._options.port);
    self.emit('listening');
  });

  self._socket.on('connection', function (socket) {
    self._debug('new connection: host=%s, port=%s', socket.remoteAddress, socket.remotePort);
    self.emit('connection', self._wrapClient(socket));
  });

  self._socket.listen(self._options.port, self._options.host);
};

Server.prototype._wrapClient = function (socket) {
  return new ServerConnection(socket);
};

Server.prototype.exit = function (callback) {
  this._debug('exit');
  this._exited = true;
  this._socket.once('close', common.callback(callback));
  this._socket.close();
};


Server.create = function (options) {
  return new Server(options);
};

//------------------------------------------------------------------------------

function ServerConnection (socket) {
  var self = this;
  self._debug = common.debug('server:connection:' + socket.remoteAddress + ':' + socket.remotePort);
  self._exited = false;

  self._socket = socket;
  self._transfer = new Transfer(self._socket, self._debug);

  self._socket.on('error', function (err) {
    self._debug('connection error: host=%s, port=%s, error=%s', socket.remoteAddress, socket.remotePort, err);
    self.emit('error', err);
  });

  self._socket.once('close', function () {
    self._debug('connection closed');
    self.emit('exit');
  });

  self._transfer.process = function (buf) {
    self.emit('data', buf);
  };
}

common.inheritsEventEmitter(ServerConnection);

ServerConnection.prototype.send = function (buf, callback) {
  this._debug('send: buffer=%s', buf.length);
  this._transfer.sendData(buf, callback);
};

ServerConnection.prototype.exit = function (callback) {
  this._debug('exit');
  this._exited = true;
  this._socket.once('close', common.callback(callback));
  this._socket.destroy();
};

//------------------------------------------------------------------------------

module.exports = Server;
