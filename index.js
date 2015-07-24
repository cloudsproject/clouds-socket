/**
 * clouds-controller
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var packageInfo = require('./package.json');
var Client = require('./src/client');
var Server = require('./src/server');


exports.version = packageInfo.version;

exports.Client = Client;
exports.createClient = Client.create;

exports.Server = Server;
exports.createServer = Server.create;
