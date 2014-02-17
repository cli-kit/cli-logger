# Logger

Logger implementation for command line interfaces.

## Install

```
npm install cli-logger
```

## Test

```
npm test
```

## Features

* Seamless integration with [ttycolor][ttycolor]
* JSON output compatible with [bunyan][bunyan]
* Bitwise log level support
* 100% code coverage

## Examples

Example programs are in the [bin][bin] directory and there are many usage examples in the [test suite][test suite].

## Usage

Unless [streams](#streams) have been configured all log messages are written to `process.stdout`.

### Normal

Normal mode uses log levels that correspond to the [bunyan][bunyan] log levels and behaviour (log messages are written if they are greater than or equal to the configured log level): 

```javascript
var logger = require('cli-logger');
var conf = {level: log.WARN};
log = logger(conf);
log.warn('mock %s message', 'warn');
// this will not be logged as the log level is warn
log.info('mock %s message', 'info');
```

### Bitwise

Using bitwise log levels allows fine-grained control of how log messages are routed, to enable bitwise mode pass `true` as the second argument when creating the logger:

```javascript
var logger = require('cli-logger');
var conf = {level: log.BW_INFO|log.BW_FATAL};
log = logger(conf, true);
log.info('mock %s message', 'info');
```

If you just want to disable one or two log levels it is more convenient to use the `XOR` operator:

```javascript
var logger = require('cli-logger');
var conf = {level: log.BW_ALL^log.BW_TRACE};
log = logger(conf, true);
log.info('mock %s message', 'info');
```

Note that in normal mode you may use string log levels, such as `'trace'`, but in bitwise mode you may only use integer log levels.

## Messages

Logging messages is consistent with [bunyan][bunyan]:

```javascript
log.info('info message')                        // log a simple message
log.warn('%s message', 'warn')                  // log a message with parameters
log.debug({foo: 'bar'}, '%s message', 'debug')  // add field(s) to the log record
log.error(err)                                  // log an Error instance
log.fatal(err, '%s error', 'fatal')             // log an Error with custom message
```

## Log Levels

The log levels correspond to a method on the logger, the methods and corresponding module constants are shown below:

```javascript
log.trace()          // TRACE: 10 | BW_TRACE: 1
log.debug()          // DEBUG: 20 | BW_DEBUG: 2
log.info()           // INFO: 30  | BW_INFO: 4
log.warn()           // WARN: 40  | BW_WARN: 8
log.error()          // ERROR: 50 | BW_ERROR: 16
log.fatal()          // FATAL: 60 | BW_FATAL: 32
```

In normal mode the additional constant `NONE` (70) may be used to disable logging. In bitwise mode you may also use `BW_NONE` (0) and `BW_ALL` (63), `BW_ALL` is particularly useful for `XOR` operations.

The API for getting and setting log levels is consistent with [bunyan][bunyan]:

```javascript
log.info()               // true if any stream is enabled for the info level
log.level()              // get a level integer (lowest level of all streams)
log.level(INFO)          // sets all streams to the INFO level
log.level('info')        // sets all streams to the INFO level (normal only)
log.level(BW_INFO)       // sets all streams to the INFO level (bitwise only)
log.levels()             // gets an array of the levels of all streams
log.levels(0)            // get level of stream at index zero
log.levels('foo')        // get level of the stream named 'foo'
log.levels(0, INFO)      // set level of stream at index zero to INFO
log.levels(0, 'info')    // set level of stream at index zero to INFO (normal only)
log.levels(0, BW_INFO)   // set level of stream at index zero to INFO (bitwise only)
log.levels('foo', WARN)  // set level of stream named 'foo' to WARN
```

## Configuration

* `console`: A boolean indicating that console methods should be used when writing log records, this enables the [ttycolor][ttycolor] integration, default is `false`.
* `json`: Print log records as newline delimited JSON, default is `false`.
* `level`: A default log level to use when a stream does not explicitly specify a log level, default is `INFO`.
* `name`: The name of the logger, default is `basename(process.argv[1])`.
* `prefix`: A function used to prepend a prefix to log messages, default is `null`.
* `serializers`: Map of log record property names to serialization functions,
  default is `null`.
* `src`: A boolean that indicates that file name, line number and function name (when available) should be included in the log record, default is `false`.
* `stack`: A boolean used in conjunction with `src` to also include an array of the stack trace caller information, default is `false`.
* `streams`: An array or object that configures the streams that log records are written to, by default if this property is not present a single stream is configured for `process.stdout`.
* `writers`: Map of log level string names to console functions, default is
  `null`. Use this to customize the functions used when `console` is `true`,
  see [writers](#writers).

If you specify any unknown properties in the configuration then these are considered *persistent fields* and are added to every log record. This is a convenient way to add labels for sub-components to log records.

### Console

Set the `console` configuration property to redirect all log messages via `console` methods, this enables integration with the [ttycolor][ttycolor] module.

The default mapping between log methods and `console` methods is:

```javascript
trace   // => console.log
debug   // => console.log
info    // => console.info
warn    // => console.warn
error   // => console.error
fatal   // => console.error
```

If required you could define your own function that has the same signature as a `console` method (`function(message, ...)`) to create different output styles using the [ttycolor][ttycolor] module methods.

Run the [color][color] example program to see the default output.

### Writers

You may customize the mapping between log methods and `console` methods by either specifying the `writers` configuration property as a `console` function (to set all log methods to the same `console` method):

```javascript
var conf = {console: true, writers: console.error};
```

Or by mapping inidividual log method names, for example if you would prefer `trace` and `debug` messages to be printed to `stderr`:

```javascript
var conf = {
  console: true,
  writers: {
    trace: console.error,
    debug: console.error
  }
}
```

### JSON

This module is designed for command line interfaces so JSON output is not enabled by default, you may enable JSON output for all streams by specifying the `json` configuration option or enable for specific streams by specifying the `json` property on a stream.

Alternatively, you can use `createLogger` to set the `json` configuration property if it is not defined:

```javascript
var logger = require('cli-logger');
log = logger.createLogger();
// ...
```

### Streams

Configuring output streams is typically done using an array, but as a convenience an object may be specified to configure a single output stream:

```javascript
var logger = require('cli-logger');
var conf = {streams: {stream: process.stderr, level: log.WARN}}
var log = logger(conf);
// ...
```

#### File

You may configure a file stream by using the `path` stream property. For example, to log the `INFO` level and above to `stdout` and `ERROR` and above to a file:

```javascript
var logger = require('cli-logger');
var conf = {streams: [
  {
    stream: process.stdout,
    level: log.INFO
  },
  {
    path: 'log/errors.log',
    level: log.ERROR
  }
]};
var log = logger(conf);
// ...
```

When creating file streams the default flags used is `a` you may specify the `flags` property to change this behaviour:

```javascript
var logger = require('cli-logger');
var conf = {streams: [
  {
    path: 'log/errors.log',
    flags: 'ax',
    level: log.ERROR
  }
]};
var log = logger(conf);
// ...
```

The `encoding` and `mode` options supported by `fs.createWriteStream` are also respected if present.

## License

Everything is [MIT](http://en.wikipedia.org/wiki/MIT_License). Read the [license](/LICENSE) if you feel inclined.

[ttycolor]: https://github.com/freeformsystems/ttycolor
[bunyan]: https://github.com/trentm/node-bunyan

[bin]: https://github.com/freeformsystems/cli-logger/tree/master/bin
[test suite]: https://github.com/freeformsystems/cli-logger/tree/master/test/unit

[color]: https://github.com/freeformsystems/cli-logger/tree/master/bin/color
