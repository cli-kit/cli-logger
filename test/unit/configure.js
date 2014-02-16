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
})
