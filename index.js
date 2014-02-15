var events = require('events');
var fs = require('fs');
var os = require('os');
var path = require('path'),
  basename = path.basename;
var util = require('util');
var Writable = require('stream').Writable;
var merge = require('cli-util').merge;

var RAW = 'raw';
var STREAM = 'stream';
var FILE = 'file';

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
  json: false,
  src: false
}

/**
 * Gather some caller info 3 stack levels up.
 *
 * See <http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi>.
 */
function getCallerInfo() {
  var obj = {stack: []};
  var limit = Error.stackTraceLimit;
  var prepare = Error.prepareStackTrace;
  Error.captureStackTrace(this, getCallerInfo);
  Error.prepareStackTrace = function (_, stack) {
    var caller = stack[3];
    obj.file = caller.getFileName();
    obj.line = caller.getLineNumber();
    var func = caller.getFunctionName();
    if(func) obj.func = func;
    obj.stack = stack.slice(3);
    obj.stack.forEach(function(caller, index, arr) {
      arr[index] = '' + caller;
    })
    return stack;
  };
  var stack = this.stack;
  Error.prepareStackTrace = prepare;
  return obj;
}

/**
 *  Create a Logger instance.
 *
 *  @param conf The logger configuration.
 */
var Logger = function(conf) {
  conf = conf || {};
  function filter(t, k, v) {
    if(k !== 'streams') {
      t[k] = v;
    }
  }
  this.conf = merge(conf, merge(defaults, {}), filter);
  this.conf.streams = conf.streams || {
    stream: process.stdout,
    level: levels.info
  }
  this.streams = this.initialize();
  this.pid = process.pid;
  this.hostname = os.hostname();
}

util.inherits(Logger, events.EventEmitter);

/**
 *  Initialize the output streams.
 *
 *  @api private
 */
Logger.prototype.initialize = function() {
  var streams = [], scope = this;
  var source = this.conf.streams;
  function append(stream, level, name) {
    stream.on('error', function(e) {
      scope.emit('error', e, stream);
    })
    streams.push({stream: stream, level: level || levels.info, name: name})
  }
  function wrap(source) {
    var stream = source.stream;
    if(source.path) {
      var opts = {
        flags: source.flags || 'a',
        mode: source.mode,
        encoding: source.encoding
      }
      try {
        source.stream = fs.createWriteStream(source.path, opts);
      }catch(e) {
        scope.emit('error', e);
      }
    }
    if(source.stream && !(source.stream instanceof Writable)
      && source.stream !== process.stdout
      && source.stream !== process.stderr) {
      throw new Error('Invalid stream specified');
    }
    append(source.stream, source.level, source.name);
  }
  if(source && typeof(source) == 'object' && !Array.isArray(source)) {
    wrap(source);
  }else if(Array.isArray(source)) {
    source.forEach(function(source) {
      wrap(source);
    })
  }else{
    throw new Error('Invalid streams configuration');
  }
  return streams;
}

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
  var parameters = [].slice.call(arguments, 2), args, z;
  var err = (message instanceof Error) ? message : null;
  var obj = (!err && message && typeof(message) == 'object') ? message : null;
  if(parameters.length) {
    if(!err && !obj) {
      parameters.unshift(message);
    }
    message = util.format.apply(util, parameters);
  }
  if(err) {
    if(arguments.length == 2) {
      message = err.message;
    }
  }
  var record = message;
  if(this.conf.json) {
    record = {};
    if(obj) {
      for(z in obj) {
        record[z] = obj[z];
      }
      if(arguments.length == 2) {
        message = '';
      }
    }
    record.pid = this.pid;
    record.hostname = this.hostname;
    record.name = this.conf.name;
    record.msg = message;
    record.level = level;
    record.time = new Date().toISOString();
    if(err) {
      record.err = {
        message: err.message,
        name: err.name,
        stack: err.stack
      }
    }
    if(this.conf.src) {
      record.src = getCallerInfo();
    }
  }
  return record;
}

/**
 *  Write the log record to stream(s) or dispatch
 *  the write event if there are listeners for the write
 *  event.
 *
 *  @api private
 *
 *  @param level The log level.
 *  @param record The log record.
 */
Logger.prototype.write = function(level, record) {
  var i, target, listeners = this.listeners('write');
  for(i = 0;i < this.streams.length;i++) {
    target = this.streams[i];
    if(!listeners.length && this.conf.json && target.type !== RAW) {
      record = JSON.stringify(record);
    }
    if(level >= target.level) {
      if(listeners.length) {
        this.emit('write', record, target.stream);
      }else{
        target.stream.write(record + '\n');
      }
    }
  }
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
  this.write(level, this.getLogRecord.apply(this, arguments));
}

/**
 *  Log a trace message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.trace = function() {
  var args = [].slice.call(arguments, 0);
  args.unshift(levels.trace);
  this.log.apply(this, args);
}

/**
 *  Log a debug message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.debug = function() {
  var args = [].slice.call(arguments, 0);
  args.unshift(levels.debug);
  this.log.apply(this, args);
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
module.exports.TRACE = levels.trace;
module.exports.DEBUG = levels.debug;
module.exports.INFO = levels.info;
module.exports.WARN = levels.warn;
module.exports.ERROR = levels.error;
module.exports.FATAL = levels.fatal;
