var events = require('events');
var os = require('os');
var path = require('path'),
  basename = path.basename;
var util = require('util');
var merge = require('cli-util').merge;

var levels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
}

var defaults = {
  name: basename(process.argv[1]),
  json: true
}

/**
 *  Create a Logger instance.
 *
 *  @param conf The logger configuration.
 */
var Logger = function(conf) {
  conf = conf || {};
  this.conf = merge(conf, merge(defaults, {}));
  this.pid = process.pid;
  this.hostname = os.hostname();
}

util.inherits(Logger, events.EventEmitter);

/**
 *  Retrieve a log record.
 *
 *  @api private
 *
 *  @param level The log level.
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.getLogRecord = function(level, message) {
  var parameters = [].slice.call(arguments, 2);
  if(parameters.length) {
    parameters.unshift(message);
    message = util.format.apply(util, parameters);
  }
  var record = message;
  if(this.conf.json) {
    record = {
      pid: this.pid,
      hostname: this.hostname,
      name: this.conf.name,
      msg: message,
      level: level,
      time: new Date().toISOString()
    };
  }
  console.log('logging message...%j', record);
}

/**
 *  Log a message.
 *
 *  @api private
 *
 *  @param level The log level.
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.log = function(level, message) {
  if(!message) return false;
  var record = this.getLogRecord.apply(this, arguments);
  //console.log('logging message...%s', message);
}

/**
 *  Log an info message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.info = function() {
  var args = [].slice.call(arguments, 0);
  args.unshift(levels.info);
  this.log.apply(this, args);
}

module.exports = function(conf) {
  var logger = new Logger(conf);
  return logger;
}

module.exports.Logger = Logger;
