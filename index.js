/**
 * clouds-controller
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var packageInfo = require('./package.json');
var common = require('./src/common');
var Client = require('./src/client');
var Server = require('./src/server');
var Datagram = require('./src/datagram');


exports.version = packageInfo.version;
exports.default = common.default;
exports.net = common.net;

exports.Client = Client;
exports.createClient = Client.create;

exports.Server = Server;
exports.createServer = Server.create;

exports.Datagram = Datagram;
exports.createDatagram = Datagram.create;
