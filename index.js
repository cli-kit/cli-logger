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

var keys = Object.keys(LEVELS); keys.pop();
var types = [RAW, STREAM, FILE];
var defaults = {
  name: basename(process.argv[1]),
  json: false,
  src: false,
  stack: false,
  console: false,
  serializers: null,
  writers: null,
  level: null,
  stream: null,
  streams: null
}

function circular() {
  var seen = [];
  return function (key, val) {
    if (!val || typeof (val) !== 'object') {
      return val;
    }
    if (seen.indexOf(val) !== -1) {
      return '[Circular]';
    }
    seen.push(val);
    return val;
  };
}

/**
 *  Create a Logger instance.
 *
 *  @param conf The logger configuration.
 *  @param bitwise A boolean indicating that log levels
 *  should use bitwise operators.
 *  @param parent A parent logger that owns this logger.
 */
var Logger = function(conf, bitwise, parent) {
  events.EventEmitter.call(this);
  conf = conf || {};
  this.bitwise = (bitwise === true);
  this.configure(bitwise);
  var cstreams = parent && conf.streams;
  var streams = conf.streams;
  delete conf.streams;
  streams = streams || {
    stream: process.stdout
  }
  var target = parent ? merge(parent.conf, {}) : merge(defaults, {});
  this.conf = merge(conf, target);
  if(typeof this.conf.name !== 'string' || !this.conf.name.length) {
    throw new Error('Logger name \'' + this.conf.name + '\' is invalid');
  }
  this.name = this.conf.name;
  conf.streams = streams;
  this.pid = this.conf.pid || process.pid;
  this.hostname = this.conf.hostname || os.hostname();
  if(this.conf.console) {
    var writers = this.conf.writers || {};
    if(typeof writers === 'function') {
      var writer = writers;
      writers = {};
      keys.forEach(function(method) {
        writers[method] = writer;
      })
    }
    this.writers = {};
    this.writers[LEVELS.trace] = writers.trace || console.log;
    this.writers[LEVELS.debug] = writers.debug || console.log;
    this.writers[LEVELS.info] = writers.info || console.info;
    this.writers[LEVELS.warn] = writers.warn || console.warn;
    this.writers[LEVELS.error] = writers.error || console.error;
    this.writers[LEVELS.fatal] = writers.fatal || console.error;
  }
  this.fields = {};
  this.streams = [];
  if(parent && cstreams) {
    streams = Array.isArray(streams) ? streams : [streams];
    streams = streams.concat(conf.streams);
  }
  this.initialize(streams);
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
  var key, value, z, exists = false;
  if(typeof(level) == 'string') {
    key = level.toLowerCase();
    level = this._levels[key];
  }
  if(!this.bitwise) {
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
Logger.prototype.initialize = function(source) {
  var i;
  if(source && typeof(source) == 'object' && !Array.isArray(source)) {
    this.convert(source);
  }else if(Array.isArray(source)) {
    for(i = 0;i < source.length;i++) {
      this.convert(source[i]);
    }
  }else{
    throw new Error('Invalid streams configuration');
  }
  // initialize custom data fields
  for(i in this.conf) {
    if(!defaults.hasOwnProperty(i)) {
      this.fields[i] = this.conf[i];
    }
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
  var scope = this;
  var level = source.level, json = source.json, stream = source.stream;
  var lvl = this.bitwise ? (level === undefined ? this.conf.level : level)
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
 *  Translate a bitwise log level to a normal mode
 *  log level.
 *
 *  @param level The bitwise log level.
 *
 *  @return A normal mode log level.
 */
Logger.prototype.translate = function(level) {
  for(var i = 0;i < keys.length;i++) {
    if(BITWISE[keys[i]] === level) {
      return LEVELS[keys[i]];
    }
  }
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
  for(z in this.fields) {
    record[z] = this.serialize(z, this.fields[z]);
  }
  if(obj) {
    for(z in obj) {
      record[z] = this.serialize(z, obj[z]);
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
 *  Serialize a log record value when a serializer
 *  is available for the log record property name.
 *
 *  @api private
 *
 *  @param k The log record key.
 *  @param v The log record value.
 *
 *  @return The original value when no serializer is declared
 *  for the property or the result of invoking the serializer function.
 */
Logger.prototype.serialize = function(k, v) {
  var serializer = this.conf.serializers
    && (typeof this.conf.serializers[k] === 'function')
    ? this.conf.serializers[k] : null;
  if(!serializer) return v;
  return serializer(v);
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
  if(!this.conf.console && parameters) {
    params = parameters.slice(0);
    params.unshift(record.msg);
    record.msg = util.format.apply(util, params);
  }
  for(i = 0;i < this.streams.length;i++) {
    target = this.streams[i];
    json = (target.json === true && !listeners.length)
      || (this.conf.json && !listeners.length);
    if(json && (target.type !== RAW)) {
      if(this.bitwise) record.level = this.translate(record.level);
      record = JSON.stringify(record, circular());
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
  var stream, bitwise = this.bitwise, i;
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
 *  Create a child of this logger.
 *
 *  @param conf The configuration for the child logger.
 *  @param bitwise A boolean indicating that log levels
 *  should use bitwise operators.
 *
 *  @return A child Logger instance.
 */
Logger.prototype.child = function(conf, bitwise) {
  return new Logger(conf,
    bitwise !== undefined ? bitwise : this.bitwise, this);
}

/**
 *  Get or set the current log level.
 *
 *  @param level A log level to set on all streams.
 *
 *  @return The lowest log level when no arguments are specified.
 */
Logger.prototype.level = function(level) {
  var i, j, stream, min = this._levels.none, bitwise = this.bitwise;
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

var RingBuffer = require('./lib/ring-buffer');
var serializers = require('./lib/serializers');

function createLogger(conf, bitwise) {
  conf = conf || {};
  if(conf.json === undefined) conf.json = true;
  return new Logger(conf, bitwise);
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
module.exports.serializers = serializers;
module.exports.circular = circular;
module.exports.createLogger = createLogger;
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
