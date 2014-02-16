var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  it('should create ring buffer', function(done) {
    var name = 'mock-ring-buffer-logger';
    var ringbuffer = new logger.RingBuffer();
    var conf = {
      name: name,
      streams: [
        {
          stream: ringbuffer,
          level: logger.TRACE
        }
      ]
    };
    var log = logger(conf);
    expect(log.streams[0].stream).to.eql(ringbuffer);
    expect(ringbuffer.limit).to.eql(16);
    expect(ringbuffer.records).to.eql([]);
    done();
  });
  it('should log to ring buffer records', function(done) {
    var name = 'mock-ring-buffer-logger';
    var ringbuffer = new logger.RingBuffer({limit: logger.keys.length});
    var conf = {
      name: name,
      streams: [
        {
          stream: ringbuffer,
          level: logger.TRACE
        }
      ]
    };
    var log = logger(conf);
    expect(ringbuffer.limit).to.eql(logger.keys.length);
    expect(ringbuffer.records).to.eql([]);
    logger.keys.forEach(function(method) {
      log[method]('mock %s message', method);
    })
    expect(ringbuffer.records.length)
      .to.eql(logger.keys.length)
      .to.eql(ringbuffer.limit);
    log.info('mock %s message', 'info');
    expect(ringbuffer.records.length)
      .to.eql(logger.keys.length)
      .to.eql(ringbuffer.limit);
    done();
  });
})
