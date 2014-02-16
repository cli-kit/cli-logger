var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function() {
  var method;
  beforeEach(function(done) {
    method = process.stderr.write;
    done();
  })
  afterEach(function(done) {
    process.stderr.write = method;
    done();
  })
  it('should log info message (json stringify code path)', function(done) {
    var msg = 'mock json info message';
    var name = 'mock-json-logger';
    var conf = {name: name, json: true, streams: {stream: process.stderr}};
    var log = logger(conf);
    process.stderr.write = function(message) {
      var str = message.trim();
      var record = JSON.parse(str);
      expect(record.msg).to.eql(msg);
      done();
    }
    log.info(msg);
  });
  it('should log info message (json stream stringify code path)',
    function(done) {
      var msg = 'mock json info message';
      var name = 'mock-json-logger';
      var conf = {name: name, streams: {stream: process.stderr, json: true}};
      var log = logger(conf);
      process.stderr.write = function(message) {
        var str = message.trim();
        var record = JSON.parse(str);
        expect(record.msg).to.eql(msg);
        done();
      }
      log.info(msg);
    }
  );
})
