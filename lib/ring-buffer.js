var util = require('util');
var Writable = require('stream').Writable;

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

module.exports = RingBuffer;
