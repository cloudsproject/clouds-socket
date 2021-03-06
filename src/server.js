/**
 * clouds-socket
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var assert = require('assert');
var common = require('./common');
var Transfer = require('./transfer');
var debug = common.debug('server');

//------------------------------------------------------------------------------

/**
 * create server
 * @param  {Object} options
 *   - {String} host
 *   - {Number} port
 *   - {String} path
 * @return {Socket}
 */

function Server (options) {
  if (!options.path) {
    assert(options.host, 'missing parameter `host`');
    assert(options.port, 'missing parameter `port`');
  }

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

  self._socket = new common.net.Server();
  self._connections = {};

  function addConnection (conn) {
    self._connections[conn.id] = conn;
    conn.once('exit', function () {
      delete self._connections[conn.id];
    });
  }

  self._socket.on('error', function (err) {
    self._debug('server error: host=%s, port=%s, path=%s, error=%s', self._options.host, self._options.port, self._options.path, err);
    self.emit('error', err);
  });

  self._socket.once('close', function () {
    self._debug('server closed');
    self.emit('exit');
  });

  self._socket.on('listening', function () {
    self._listening = true;
    self._debug('listening: host=%s, port=%s, path=%s', self._options.host, self._options.port, self._options.path);
    self.emit('listening');
  });

  self._socket.on('connection', function (socket) {
    self._debug('new connection: host=%s, port=%s', socket.remoteAddress, socket.remotePort);
    var client = self._wrapClient(socket);
    addConnection(client);
    self.emit('connection', client);
  });

  if (self._options.path) {
    self._socket.listen({path: self._options.path});
  } else {
    self._socket.listen({port: self._options.port, host: self._options.host});
  }
};

Server.prototype._wrapClient = function (socket) {
  return new ServerConnection(socket);
};

Server.prototype.exit = function (callback) {
  var self = this;
  self._debug('exit');
  self._exited = true;
  self._socket.once('close', common.callback(callback));

  // close all connections
  for (var i in self._connections) {
    var conn = self._connections[i];
    if (conn._exited) continue;
    conn.exit();
  }

  self._socket.close();
};


Server.create = function (options) {
  return new Server(options);
};

//------------------------------------------------------------------------------

function ServerConnection (socket) {
  var self = this;
  if (socket.remoteAddress && socket.remotePort) {
    self._debug = common.debug('server:connection:' + socket.remoteAddress + ':' + socket.remotePort);
  } else {
    self._debug = common.debug('server:connection:unix-domain');
  }
  self._exited = false;
  self.id = Date.now() + '' + common.randomString(10);

  self._socket = socket;
  self._transfer = Transfer.create(self._socket, self._debug);

  self._socket.on('error', function (err) {
    self._debug('connection error: host=%s, port=%s, error=%s', socket.remoteAddress, socket.remotePort, err);
    self.emit('error', err);
  });

  self._socket.once('close', function () {
    self._debug('connection closed');
    self.emit('exit');
  });

  self._transfer.on('data', function (buf) {
    self.emit('data', buf);
  });
}

common.inheritsEventEmitter(ServerConnection);

ServerConnection.prototype.ping = function (callback) {
  this._transfer.ping(callback);
};

ServerConnection.prototype.send = function (buf, callback) {
  this._debug('send: buffer=%s', buf.length);
  this._transfer.send(buf, callback);
};

ServerConnection.prototype.exit = function (callback) {
  this._debug('exit');
  this._exited = true;
  this._socket.once('close', common.callback(callback));
  this._socket.destroy();
};

//------------------------------------------------------------------------------

module.exports = Server;
