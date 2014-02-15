var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should log info message (json)', function(done) {
    var name = 'mock-info-logger';
    var conf = {name: name, json: true};
    var log = logger(conf);
    log.info('mock info message');
    done();
  });
  it('should log info message', function(done) {
    var name = 'mock-info-logger';
    var conf = {name: name, level: 'info'};
    var log = logger(conf);
    expect(log.info()).to.eql(true);
    log.info('mock info message');
    done();
  });
  it('should log info message with parameters (json)', function(done) {
    var name = 'mock-info-logger';
    var conf = {name: name, json: true};
    var log = logger(conf);
    log.info('mock %s message', 'info');
    done();
  });
  it('should ignore info with error level', function(done) {
    var name = 'mock-info-logger';
    var conf = {name: name, level: logger.ERROR};
    var log = logger(conf);
    expect(log.info()).to.eql(false);
    log.info('mock %s message to ignore', 'info');
    done();
  });
})
