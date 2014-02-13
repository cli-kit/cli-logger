var expect = require('chai').expect;
var logger = require('../..');
var Logger = require('../..').Logger;

describe('cli-logger:', function() {
  it('should configure logger', function(done) {
    var log = logger();
    expect(log).to.be.instanceof(Logger);
    done();
  });
})
