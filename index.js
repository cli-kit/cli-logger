var events = require('events');
var fs = require('fs');
var os = require('os');
var path = require('path'),
  basename = path.basename;
var util = require('util');
var Writable = require('stream').Writable;
var merge = require('cli-util').merge;

var pkg = require(path.join(__dirname, 'package.json'));
var major = parseInt(pkg.version.split('.')[0]);

var RAW = 'raw';
var STREAM = 'stream';
var FILE = 'file';

var levels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  none: 70
}

var defaults = {
  name: basename(process.argv[1]),
  json: false,
  src: false,
  console: false
}

//var writers = {};

/**
 *  Resolve a level string name to the corresponding
 *  integer value.
 *
 *  @param level A string or integer.
 *
 *  @return The level integer or undefined if a string value
 *  does not correspond to a known log level.
 */
function resolve(level) {
  var msg = 'Unknown log level \'' + level + '\'';
  var key, value, z, exists = false;
  if(typeof(level) == 'string') {
    key = level.toLowerCase();
    level = levels[key];
  }
  for(z in levels) {
    if(levels[z] === level) {
      exists = true;
      break;
    }
  }
  if(level === undefined || !exists) throw new Error(msg);
  return level;
}

/**
 *  Gather some caller info.
 *
 *  See <http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi>.
 */
function getCallerInfo() {
  var obj = {};
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
    stream: process.stdout
  }
  this.pid = this.conf.pid || process.pid;
  this.hostname = this.conf.hostname || os.hostname();
  if(this.conf.console) {
    var writers = this.writers = {};
    writers[levels.trace] = console.log;
    writers[levels.debug] = console.log;
    writers[levels.info] = console.info;
    writers[levels.warn] = console.warn;
    writers[levels.error] = console.error;
    writers[levels.fatal] = console.error;
  }
  this.streams = this.initialize();
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
    var lvl = level || scope.conf.level || levels.info;
    streams.push({stream: stream,
      level: resolve(lvl), name: name})
    stream.on('error', function(e) {
      scope.emit('error', e, stream);
    })
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
    //console.dir(source);
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
  //var raw = parameters.slice(0);
  var err = (message instanceof Error) ? message : null;
  var obj = (!err && message && typeof(message) == 'object') ? message : null;
  if(parameters.length && !this.conf.console) {
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
  if(this.conf.console) {
    record = {message: message, parameters: parameters};
  }else if(this.conf.json) {
    record = {};
    record.time = new Date().toISOString();
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
    record.v = major;
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
    }else if(!this.conf.json) {

    }
    if(level >= target.level) {
      if(listeners.length) {
        this.emit('write', record, target.stream);
      }else{
        if(this.conf.console && this.writers[level]) {
          this.writers[level].apply(
            console, [record.message].concat(record.parameters));
        }else{
          target.stream.write(record + '\n');
        }
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
  if(!level) return false;
  if(level && !message) return this.enabled(level);
  this.write(level, this.getLogRecord.apply(this, arguments));
}

/**
 *  Get or set the current log level.
 *
 *  @param level A log level to set on all streams.
 *
 *  @return The lowest log level when no arguments are specified.
 */
Logger.prototype.level = function(level) {
  var i, stream, min;
  if(!arguments.length) {
    min = levels.none;
    for(i = 0;i < this.streams.length;i++) {
      stream = this.streams[i];
      min = Math.min(min, stream.level);
    }
    return min;
  }else{
    level = resolve(level);
    for(i = 0;i < this.streams.length;i++) {
      stream = this.streams[i];
      stream.level = level;
    }
  }
}

/**
 *  Determine if a log level is enabled.
 *
 *  @param level The target log level.
 */
Logger.prototype.enabled = function(level) {
  var stream;
  for(var i = 0;i < this.streams.length;i++) {
    stream = this.streams[i];
    if(level >= stream.level) {
      return true;
    }
  }
  return false;
}

/**
 *  Log a trace message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.trace = function() {
  if(!arguments.length) return this.enabled(levels.trace);
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
  if(!arguments.length) return this.enabled(levels.debug);
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
  if(!arguments.length) return this.enabled(levels.info);
  var args = [].slice.call(arguments, 0);
  args.unshift(levels.info);
  this.log.apply(this, args);
}

/**
 *  Log a warn message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.warn = function() {
  if(!arguments.length) return this.enabled(levels.warn);
  var args = [].slice.call(arguments, 0);
  args.unshift(levels.warn);
  this.log.apply(this, args);
}

/**
 *  Log an error message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.error = function() {
  if(!arguments.length) return this.enabled(levels.error);
  var args = [].slice.call(arguments, 0);
  args.unshift(levels.error);
  this.log.apply(this, args);
}

/**
 *  Log a fatal message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.fatal = function() {
  if(!arguments.length) return this.enabled(levels.fatal);
  var args = [].slice.call(arguments, 0);
  args.unshift(levels.fatal);
  this.log.apply(this, args);
}

module.exports = function(conf) {
  var logger = new Logger(conf);
  return logger;
}

module.exports.levels = levels;
module.exports.Logger = Logger;
module.exports.ALL = levels.all;
module.exports.TRACE = levels.trace;
module.exports.DEBUG = levels.debug;
module.exports.INFO = levels.info;
module.exports.WARN = levels.warn;
module.exports.ERROR = levels.error;
module.exports.FATAL = levels.fatal;
module.exports.NONE = levels.none;
module.exports.LOG_VERSION = major;
