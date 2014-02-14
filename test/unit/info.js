var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should log info message (json)', function(done) {
    var name = 'mock-logger';
    var conf = {name: name, json: true};
    var log = logger(conf);
    log.info('a mock info message');
    done();
  });
  it('should log info message', function(done) {
    var name = 'mock-logger';
    var conf = {name: name};
    var log = logger(conf);
    log.info('a mock info message');
    done();
  });
  it('should log info message with parameters (json)', function(done) {
    var name = 'mock-logger';
    var conf = {name: name, json: true};
    var log = logger(conf);
    log.info('a mock %s message', 'info');
    done();
  });
  it('should ignore trace with info level', function(done) {
    var name = 'mock-logger';
    var conf = {name: name};
    var log = logger(conf);
    log.trace('a mock %s message', 'trace');
    done();
  });
  it('should ignore debug with info level', function(done) {
    var name = 'mock-logger';
    var conf = {name: name};
    var log = logger(conf);
    log.debug('a mock %s message', 'debug');
    done();
  });
})
