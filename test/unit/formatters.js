var expect = require('chai').expect;
var logger = require('../..');

describe('cli-logger:', function () {
  it('should write using normalize flag if present', function (done) {
    var msg = 'mock write %s';
    var parameters = ['info'];
    var expected = 'Mock write info.';
    var name = 'mock-write-logger';
    var conf = {name: name, json: true, streams: [
      {path: 'log/mock-write.log'}
    ], normalize: true};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      expect(record.err.message).to.eql('boom');
      done();
    });
    log.info(new Error('boom'), msg, parameters[0]);
  });
  it('should prefer normalize flag over custom pedantic string', function (done) {
    var msg = 'mock write %s';
    var parameters = ['info'];
    var expected = 'Mock write info.';
    var name = 'mock-write-logger';
    var conf = {name: name, json: true, streams: [
      {path: 'log/mock-write.log'}
    ], normalize: true, pedantic: '?'};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      expect(record.err.message).to.eql('boom');
      done();
    });
    log.info(new Error('boom'), msg, parameters[0]);
  });
  it('should not attempt format a stringified object', function (done) {
    var msg = {foo: 'bar'};
    var expected = JSON.stringify(msg);
    var name = 'mock-write-logger';
    var conf = {name: name, json: false, streams: [
      {path: 'log/mock-write.log'}
    ], normalize: true, pedantic: true, capitalize: true, formatter: function formatter(msg) {
      return msg.replace(/"/g, "'");
    }};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      done();
    });
    log.info(msg);
  });
  it('should not attempt format a stringified array', function (done) {
    var msg = ['bar'];
    var expected = JSON.stringify(msg);
    var name = 'mock-write-logger';
    var conf = {name: name, json: false, streams: [
      {path: 'log/mock-write.log'}
    ], normalize: true, pedantic: true, capitalize: true, formatter: function formatter(msg) {
      return msg.replace(/"/g, "'");
    }};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      done();
    });
    log.info(msg);
  });
  it('should capitalize the first letter of the message', function (done) {
    var msg = 'mock write %s';
    var parameters = ['info'];
    var expected = 'Mock write info';
    var name = 'mock-write-logger';
    var conf = {name: name, json: true, streams: [
      {path: 'log/mock-write.log'}
    ], capitalize: true};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      expect(record.err.message).to.eql('boom');
      done();
    });
    log.info(new Error('boom'), msg, parameters[0]);
  });
  it('should end the string with a period', function (done) {
    var msg = 'mock write %s';
    var parameters = ['info'];
    var expected = 'mock write info.';
    var name = 'mock-write-logger';
    var conf = {name: name, json: true, streams: [
      {path: 'log/mock-write.log'}
    ], pedantic: true};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      expect(record.err.message).to.eql('boom');
      done();
    });
    log.info(new Error('boom'), msg, parameters[0]);

  });
  it('should leverage custom pedantic "period" if present', function (done) {
    var msg = 'mock write info';
    var expected = 'mock write info!@!~!~!~!11!1!';
    var name = 'mock-write-logger';
    var conf = {name: name, json: true, streams: [
      {path: 'log/mock-write.log'}
    ], pedantic: '!@!~!~!~!11!1!'};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      expect(record.err.message).to.eql('boom');
      done();
    });
    log.info(new Error('boom'), msg);
  });
  it('should allow a user-defined formatter', function (done) {
    var msg = 'mock write %s';
    var formatter = function formatter(msg) {
      return msg.replace('write', 'WRITE');
    };
    var parameters = ['info'];
    var expected = 'mock WRITE info';
    var name = 'mock-write-logger';
    var conf = {name: name, json: true, streams: [
      {path: 'log/mock-write.log'}
    ], formatter: formatter};
    var log = logger(conf);
    log.on('write', function (record) {
      expect(record.msg).to.eql(expected);
      expect(record.err.message).to.eql('boom');
      done();
    });
    log.info(new Error('boom'), msg, parameters[0]);
  });
});
