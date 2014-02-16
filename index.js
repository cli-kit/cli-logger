var events = require('events');
var fs = require('fs');
var os = require('os');
var path = require('path'), basename = path.basename;
var util = require('util');
var Writable = require('stream').Writable;
var merge = require('cli-util').merge;

var pkg = require(path.join(__dirname, 'package.json'));
var major = parseInt(pkg.version.split('.')[0]), z;

var RAW = 'raw';
var STREAM = 'stream';
var FILE = 'file';

var LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  none: 70
}

var BITWISE = {
  none: 0,
  trace: 1,
  debug: 2,
  info: 4,
  warn: 8,
  error: 16,
  fatal: 32,
  all: 63
}

var keys = Object.keys(LEVELS);
keys.pop();

var types = [
  RAW,
  STREAM,
  FILE
]

var defaults = {
  name: basename(process.argv[1]),
  json: false,
  src: false,
  stack: false,
  console: false
}

/**
 *  Create a Logger instance.
 *
 *  @param conf The logger configuration.
 *  @param bitwise A boolean indicating that log levels
 *  should use bitwise operators.
 */
var Logger = function(conf, bitwise) {
  conf = conf || {};
  conf.bitwise = (bitwise === true);
  this.configure(bitwise);
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
    this.writers = {};
    this.writers[LEVELS.trace] = console.log;
    this.writers[LEVELS.debug] = console.log;
    this.writers[LEVELS.info] = console.info;
    this.writers[LEVELS.warn] = console.warn;
    this.writers[LEVELS.error] = console.error;
    this.writers[LEVELS.fatal] = console.error;
  }
  this.initialize();
}

util.inherits(Logger, events.EventEmitter);

/**
 *  Configure bitwise log levels.
 *
 *  @api private
 *
 *  @param bitwise A boolean indicating that log levels
 *  should use bitwise operators.
 */
Logger.prototype.configure = function(bitwise) {
  this._levels = {}
  var target = bitwise ? BITWISE : LEVELS;
  for(var z in target) {
    this._levels[z] = target[z];
    this[z.toUpperCase()] = this._levels[z];
  }
}

/**
 *  Resolve a level string name to the corresponding
 *  integer value.
 *
 *  @api private
 *
 *  @param level A string or integer.
 *
 *  @return The level integer or undefined if a string value
 *  does not correspond to a known log level.
 */
Logger.prototype.resolve = function(level) {
  var msg = 'Unknown log level \'' + level + '\'';
  var key, value, z, exists = false, bitwise = this.conf.bitwise;
  if(typeof(level) == 'string') {
    key = level.toLowerCase();
    level = this._levels[key];
  }
  if(!bitwise) {
    for(z in this._levels) {
      if(this._levels[z] === level) {
        exists = true;
        break;
      }
    }
    if(level === undefined || !exists) throw new Error(msg);
  }
  return level;
}


/**
 *  Initialize the output streams.
 *
 *  @api private
 */
Logger.prototype.initialize = function() {
  this.streams = [];
  var source = this.conf.streams, i;
  if(source && typeof(source) == 'object' && !Array.isArray(source)) {
    this.convert(source);
  }else if(Array.isArray(source)) {
    for(i = 0;i < source.length;i++) {
      this.convert(source[i]);
    }
  }else{
    throw new Error('Invalid streams configuration');
  }
}

/**
 *  Append a stream.
 *
 *  @api private
 *
 *  @param source The stream configuration object.
 */
Logger.prototype.append = function(source) {
  var scope = this, bitwise = this.conf.bitwise;
  var level = source.level, json = source.json, stream = source.stream;
  var lvl = bitwise ? (level === undefined ? this.conf.level : level)
    : level || this.conf.level || this._levels.info;
  var data = {
    stream: stream,
    level: scope.resolve(lvl),
    name: source.name,
    type: source.type
  }
  if(typeof json === 'boolean') data.json = json;
  this.streams.push(data);
  stream.on('error', function(e) {
    scope.emit('error', e, stream);
  })
}

/**
 *  Convert a stream configuration object into a
 *  stream instance.
 *
 *  @api private
 *
 *  @param source The stream configuration object.
 */
Logger.prototype.convert = function(source) {
  var stream = source.stream, opts;
  source.type = source.type || STREAM;
  if(source.path) {
    source.type = FILE;
    opts = {
      flags: source.flags || 'a',
      mode: source.mode,
      encoding: source.encoding
    }
    try {
      source.stream = fs.createWriteStream(source.path, opts);
    }catch(e) {
      this.emit('error', e);
    }
  }
  if(!~types.indexOf(source.type)) {
    throw new Error('Unknown stream type \'' + source.type + '\'');
  }
  if(source.stream && !(source.stream instanceof Writable)
    && source.stream !== process.stdout
    && source.stream !== process.stderr) {
    throw new Error('Invalid stream specified');
  }
  if((source.stream instanceof RingBuffer)) {
    source.type = RAW;
  }
  this.append(source);
}

/**
 *  Retrieve caller info, used when the src configuration
 *  property is true to determine the file and line number
 *  that the log call came from.
 *
 *  @api private
 *
 *  @see http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
 */
Logger.prototype.getCallerInfo = function() {
  var obj = {}, stacktrace = this.conf.stack;
  var limit = Error.stackTraceLimit;
  var prepare = Error.prepareStackTrace;
  Error.captureStackTrace(this, arguments.callee);
  Error.prepareStackTrace = function (_, stack) {
    var caller = stack[3];
    obj.file = caller.getFileName();
    obj.line = caller.getLineNumber();
    var func = caller.getFunctionName();
    if(func) obj.func = func;
    if(stacktrace) {
      obj.stack = stack.slice(3);
      obj.stack.forEach(function(caller, index, arr) {
        arr[index] = '' + caller;
      })
    }
    return stack;
  };
  var stack = this.stack;
  Error.prepareStackTrace = prepare;
  return obj;
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
  if(err || obj) {
    message = arguments[2] || '';
    parameters = [].slice.call(arguments, 3);
  }
  if(err && arguments.length == 2) {
    message = err.message;
  }
  var record = {};
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
    record.src = this.getCallerInfo();
  }
  record.v = major;
  return {record: record, parameters: parameters};
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
 *  @param parameters Message replacement parameters.
 */
Logger.prototype.write = function(level, record, parameters) {
  var i, target, listeners = this.listeners('write'), json, params;
  for(i = 0;i < this.streams.length;i++) {
    target = this.streams[i];
    json = (target.json === true && !listeners.length)
      || (this.conf.json && !listeners.length);
    if(!this.conf.console && parameters) {
      params = parameters.slice(0);
      params.unshift(record.msg);
      record.msg = util.format.apply(util, params);
    }
    if(json && (target.type !== RAW)) {
      record = JSON.stringify(record);
    }
    if(this.enabled(level, target.level)) {
      if(listeners.length) {
        this.emit('write', record, target.stream);
      }else{
        if(this.conf.console && this.writers[level]) {
          this.writers[level].apply(
            console, [record.msg].concat(parameters));
        }else{
          if(typeof record === 'string') {
            target.stream.write(record + '\n');
          }else{
            target.stream.write(record);
          }
        }
      }
    }
  }
  return (listeners.length === 0);
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
  var info = this.getLogRecord.apply(this, arguments);
  return this.write(level, info.record, info.parameters);
}

/**
 *  Determine if a log level is enabled.
 *
 *  @api private
 *
 *  @param level The log level.
 *  @param source A source log level configured on a stream.
 */
Logger.prototype.enabled = function(level, source) {
  var stream, bitwise = this.conf.bitwise, i;
  if(arguments.length === 1) {
    for(i = 0;i < this.streams.length;i++) {
      stream = this.streams[i];
      if(bitwise) {
        if((stream.level&level) === level) {
          return true;
        }
      }else{
        if(level >= stream.level) {
          return true;
        }
      }
    }
  }else{
    if(bitwise) {
      return (source&level) === level;
    }else{
      return level >= source;
    }
  }
  return false;
}

/**
 *  Get or set the current log level.
 *
 *  @param level A log level to set on all streams.
 *
 *  @return The lowest log level when no arguments are specified.
 */
Logger.prototype.level = function(level) {
  var i, j, stream, min = this._levels.none, bitwise = this.conf.bitwise;
  if(!arguments.length) {
    if(!bitwise) {
      for(i = 0;i < this.streams.length;i++) {
        stream = this.streams[i];
        min = Math.min(min, stream.level);
      }
    }else{
      min = Number.MAX_VALUE;
      var keys = Object.keys(BITWISE);
      var none = keys.shift();
      var zero = BITWISE[none], value;
      for(i = 0;i < this.streams.length;i++) {
        stream = this.streams[i];
        if(stream.level === zero) return zero;
        for(j = 0;j < keys.length;j++) {
          value = BITWISE[keys[j]];
          if((stream.level&value) === value) {
            min = Math.min(min, value);
          }
        }
      }
    }
    return min;
  }else{
    if(bitwise && typeof(level) !== 'number') {
      throw new Error('Value for bitwise levels must be a number');
    }
    level = bitwise ? level : this.resolve(level);
    for(i = 0;i < this.streams.length;i++) {
      stream = this.streams[i];
      stream.level = level;
    }
  }
}

/**
 *  Get or set the current log level for streams.
 *
 *  @param name The stream integer index or name.
 *  @param level The new level for the stream(s).
 */
Logger.prototype.levels = function(name, level) {
  var stream, i, levels;
  if(!arguments.length) {
    levels = [];
    this.streams.forEach(function(stream) {
      levels.push(stream.level);
    })
    return levels;
  }else{
    if(typeof name == 'number') {
      stream = this.streams[name];
    }else{
      for(i = 0;i < this.streams.length;i++) {
        if(this.streams[i].name === name) {
          stream = this.streams[i];
          break;
        }
      }
    }
    if(!stream) throw new Error('No stream found matching \'' + name + '\'');
    if(arguments.length === 1) {
      return stream.level;
    }else{
      stream.level = this.resolve(level);
    }
  }
}

/**
 *  Log a trace message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.trace = function() {
  var lvl = this._levels.trace;
  if(!arguments.length) return this.enabled(lvl);
  var args = [].slice.call(arguments, 0);
  args.unshift(lvl);
  return this.log.apply(this, args);
}

/**
 *  Log a debug message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.debug = function() {
  var lvl = this._levels.debug;
  if(!arguments.length) return this.enabled(lvl);
  var args = [].slice.call(arguments, 0);
  args.unshift(lvl);
  return this.log.apply(this, args);
}

/**
 *  Log an info message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.info = function() {
  var lvl = this._levels.info;
  if(!arguments.length) return this.enabled(lvl);
  var args = [].slice.call(arguments, 0);
  args.unshift(lvl);
  return this.log.apply(this, args);
}

/**
 *  Log a warn message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.warn = function() {
  var lvl = this._levels.warn;
  if(!arguments.length) return this.enabled(lvl);
  var args = [].slice.call(arguments, 0);
  args.unshift(lvl);
  return this.log.apply(this, args);
}

/**
 *  Log an error message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.error = function() {
  var lvl = this._levels.error;
  if(!arguments.length) return this.enabled(lvl);
  var args = [].slice.call(arguments, 0);
  args.unshift(lvl);
  return this.log.apply(this, args);
}

/**
 *  Log a fatal message.
 *
 *  @param message The log message.
 *  @param ... The message replacement parameters.
 */
Logger.prototype.fatal = function() {
  var lvl = this._levels.fatal;
  if(!arguments.length) return this.enabled(lvl);
  var args = [].slice.call(arguments, 0);
  args.unshift(lvl);
  return this.log.apply(this, args);
}

/**
 *  Creates a RingBuffer instance.
 *
 *  @param options The stream configuration options.
 */
var RingBuffer = function(options) {
  Writable.apply(this, arguments);
  options = options || {};
  this.limit = options.limit || 16;
  this.records = [];
}

util.inherits(RingBuffer, Writable);

/**
 *  Write to the underlying records array.
 *
 *  @param chunk The buffer or string to write, will
 *  be coerced to a string.
 */
RingBuffer.prototype.write = function(chunk) {
  var record = chunk;
  if((chunk instanceof Buffer) || typeof chunk === 'string') {
    record = '' + chunk;
    record = record.replace(/\s+$/, '');
  }
  this.records.unshift(record);
  if(this.records.length > this.limit) {
    this.records.pop();
  }
}

/**
 *  Create a logger.
 *
 *  @param conf The logger configuration.
 *  @param bitwise A boolean indicating that log levels
 *  should use bitwise operators.
 */
module.exports = function(conf, bitwise) {
  return new Logger(conf, bitwise);
}

module.exports.levels = LEVELS;
module.exports.bitwise = BITWISE;
module.exports.types = types;
module.exports.keys = keys;
module.exports.Logger = Logger;
module.exports.RingBuffer = RingBuffer;
for(z in LEVELS) {
  module.exports[z.toUpperCase()] = LEVELS[z];
}
for(z in BITWISE) {
  module.exports['BW_' + z.toUpperCase()] = BITWISE[z];
}
module.exports.RAW = RAW;
module.exports.STREAM = STREAM;
module.exports.FILE = FILE;
module.exports.LOG_VERSION = major;
