var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should log error message', function(done) {
    var name = 'mock-error-logger';
    var conf = {name: name, level: logger.ERROR};
    var log = logger(conf);
    expect(log.error()).to.eql(true);
    log.error('mock error message');
    done();
  });
  it('should ignore error with fatal level', function(done) {
    var name = 'mock-error-logger';
    var conf = {name: name, level: logger.FATAL};
    var log = logger(conf);
    expect(log.error()).to.eql(false);
    log.error('mock %s message to ignore', 'error');
    done();
  });
})
