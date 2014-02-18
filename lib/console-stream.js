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

/**
 *  Write to the underlying console method.
 *
 *  @param record The log record.
 */
ConsoleStream.prototype.write = function(record) {
  var level = record.level;
  if(this.writers[level]) {
    this.writers[level].apply(
      console, [record.message].concat(record.parameters));
  }
}

module.exports = ConsoleStream;
