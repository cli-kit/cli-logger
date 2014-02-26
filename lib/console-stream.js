var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 *  Creates a ConsoleStream instance.
 *
 *  @param options The stream configuration options.
 */
var ConsoleStream = function(options) {
  EventEmitter.apply(this, arguments);
  this.options = options || {};
}

util.inherits(ConsoleStream, EventEmitter);

/**
 *  Initialize writers based on the log configuration.
 *
 *  @param log The logger instance.
 */
ConsoleStream.prototype.logger = function(log) {
  var writers = this.options.writers || {};
  if(typeof writers === 'function') {
    var writer = writers;
    writers = {};
    log.keys.forEach(function(method) {
      writers[method] = writer;
    })
  }
  this.writers = {};
  this.writers[log.TRACE] = writers.trace || console.log;
  this.writers[log.DEBUG] = writers.debug || console.log;
  this.writers[log.INFO] = writers.info || console.info;
  this.writers[log.WARN] = writers.warn || console.warn;
  this.writers[log.ERROR] = writers.error || console.error;
  this.writers[log.FATAL] = writers.fatal || console.error;
}

ConsoleStream.prototype.prefix = function(prefix, msg, parameters) {
  if(parameters) parameters.unshift(prefix);
  return '%s ' + msg;
}

ConsoleStream.prototype.format = function(msg, parameters) {
  parameters = parameters || [];
  var ttycolor = global.ttycolor;
  var usetty = ttycolor && (ttycolor.revert !== undefined);
  if(usetty) {
    return ttycolor.format.apply(
      ttycolor, [msg].concat(parameters));
  }else{
    return util.format.apply(util, [msg].concat(parameters))
  }
}

/**
 *  Write to the underlying console method.
 *
 *  @param record The log record.
 */
ConsoleStream.prototype.write = function(record, prefix) {
  var msg = record.message, newline = msg ? ~msg.indexOf('\n') : false;
  var level = record.level, writer = this.writers[level], scope = this;
  function println(msg, parameters) {
    writer.apply(
      console, [msg].concat(parameters));
  }
  if(msg instanceof Error) {
    console.dir('console stream error');
  }
  if(writer) {
    if(!prefix) return println(msg, record.parameters);

    // prefix all lines
    // check parameters for a newline
    if(!newline) {
      var params = record.parameters || [];
      for(var i =0;i < params.length;i++) {
        if(/\n/.test(params[i])) {
          newline = true; break;
        }
      }
    }
    if(newline) {
      msg = this.format(msg, record.parameters);
      var lines = msg.split('\n');
      // trailing newline, prevent double newline
      if(!lines[lines.length - 1]) {
        lines.pop();
      }
      //console.dir(msg);
      lines.forEach(function(line) {
        msg = scope.prefix(prefix, '' + line);
        println(msg, [prefix]);
      })
    }else{
      msg = this.prefix(prefix, msg, record.parameters);
      println(msg, record.parameters);
    }
  }
}

module.exports = ConsoleStream;
