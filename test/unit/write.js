var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should listen for write event', function(done) {
    var msg = 'mock write info';
    var name = 'mock-write-logger';
    var conf = {name: name, streams: [{path: 'log/mock-write.log'}]};
    var log = logger(conf);
    log.on('write', function(record, stream) {
      expect(record.pid).to.be.a('number');
      expect(record.hostname).to.be.a('string');
      expect(record.time).to.be.a('string');
      expect(record.msg).to.eql(msg);
      expect(record.level).to.eql(logger.INFO);
      done();
    })
    log.info(msg);
  });
})
