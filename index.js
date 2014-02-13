var events = require('events');
var util = require('util');

var defaults = {

}

var Logger = function(conf) {

}

util.inherits(Logger, events.EventEmitter);

module.exports = function(conf) {
  var logger = new Logger(conf);
  return logger;
}

module.exports.Logger = Logger;
