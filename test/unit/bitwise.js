var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should configure bitwise levels', function(done) {
    var log = logger(null, true);
    expect(logger.levels.none)
      .to.eql(logger.NONE).to.eql(0);
    expect(logger.levels.trace)
      .to.eql(logger.TRACE).to.eql(1);
    expect(logger.levels.debug)
      .to.eql(logger.DEBUG).to.eql(2);
    expect(logger.levels.info)
      .to.eql(logger.INFO).to.eql(4);
    expect(logger.levels.warn)
      .to.eql(logger.WARN).to.eql(8);
    expect(logger.levels.error)
      .to.eql(logger.ERROR).to.eql(16);
    expect(logger.levels.fatal)
      .to.eql(logger.FATAL).to.eql(32);
    expect(logger.levels.all)
      .to.eql(logger.ALL).to.eql(63);
    done();
  });
  it('should restore levels', function(done) {
    var log = logger(null, false);
    expect(logger.levels.trace)
      .to.eql(logger.TRACE).to.eql(10);
    expect(logger.levels.debug)
      .to.eql(logger.DEBUG).to.eql(20);
    expect(logger.levels.info)
      .to.eql(logger.INFO).to.eql(30);
    expect(logger.levels.warn)
      .to.eql(logger.WARN).to.eql(40);
    expect(logger.levels.error)
      .to.eql(logger.ERROR).to.eql(50);
    expect(logger.levels.fatal)
      .to.eql(logger.FATAL).to.eql(60);
    expect(logger.levels.none)
      .to.eql(logger.NONE).to.eql(70);
    expect(logger.levels.all)
      .to.eql(logger.ALL).to.eql(undefined);
    done();
  });
})
