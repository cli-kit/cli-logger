var expect = require('chai').expect;
var logger = require('../..');
var Logger = require('../..').Logger;

describe('cli-logger:', function() {
  it('should configure logger (defaults)', function(done) {
    var log = logger();
    expect(log).to.be.instanceof(Logger);
    done();
  });
  it('should configure logger (custom)', function(done) {
    var name = 'mock-logger';
    var conf = {name: name};
    var log = logger(conf);
    expect(log).to.be.instanceof(Logger);
    expect(log.conf.name).to.eql(name);
    done();
  });
  it('should handle empty message', function(done) {
    var log = logger();
    log.info();
    done();
  });
  it('should log info message', function(done) {
    var name = 'mock-logger';
    var conf = {name: name};
    var log = logger(conf);
    log.info('a mock info message');
    done();
  });
  it('should log info message (plain)', function(done) {
    var name = 'mock-logger';
    var conf = {name: name, json: false};
    var log = logger(conf);
    log.info('a mock info message');
    done();
  });
  it('should log info message with parameters', function(done) {
    var name = 'mock-logger';
    var conf = {name: name};
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
