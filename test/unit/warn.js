var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should log warn message', function(done) {
    var name = 'mock-warn-logger';
    var conf = {name: name, level: logger.WARN};
    var log = logger(conf);
    log.warn('mock warn message');
    done();
  });
  it('should ignore warn with error level', function(done) {
    var name = 'mock-warn-logger';
    var conf = {name: name, level: logger.ERROR};
    var log = logger(conf);
    log.warn('mock %s message to ignore', 'warn');
    done();
  });
})
