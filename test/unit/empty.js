var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should handle empty message', function(done) {
    var log = logger();
    log.info();
    done();
  });
})
