var util = require('util');
var expect = require('chai').expect;
var logger = require('../..');

var Component = function(logger, bitwise) {
  this.message = 'mock %s message';
  this.name = 'subcomponent';
  var options = {component: this.name};
  //if(bitwise) options.level = logger.BW_INFO;
  this.logger = logger.child(options, bitwise);
  //if(bitwise) this.logger.levels(0, logger.BW_INFO);
  //console.dir(this.logger.info());
  //console.dir(this.logger.conf);
  //console.dir(this.logger.bitwise);
}

Component.prototype.print = function() {
  this.logger.info(this.message, this.name);
}

describe('cli-logger:', function() {
  it('should create child logger (json)', function(done) {
    var name = 'mock-child-logger';
    var conf = {name: name, json: true};
    var log = logger(conf);
    var child = new Component(log);
    var msg = util.format(child.message, child.name);
    child.logger.on('write', function(record, stream) {
      expect(record).to.be.an('object');
      expect(record.component).to.eql(child.name);
      expect(record.msg).to.eql(msg);
      done();
    })
    child.print();
  });
  //it('should create bitwise child logger (json)', function(done) {
    //var name = 'mock-child-logger';
    //var conf = {name: name, json: true};
    //var log = logger(conf);
    //var child = new Component(log, true);
    //var msg = util.format(child.message, child.name);
    //child.logger.on('write', function(record, stream) {
      //expect(record).to.be.an('object');
      //expect(record.component).to.eql(child.name);
      //expect(record.msg).to.eql(msg);
      //done();
    //})
    //child.print();
  //});
})
