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
var log = require('cli-logger');
var conf = {level: log.WARN};
logger = log(conf);
logger.warn('mock %s message', 'warn');
// this will not be logged as the log level is warn
logger.info('mock %s message', 'info');
```

### Bitwise

Using bitwise log levels allows fine-grained control of how log messages are routed, to enable bitwise mode pass `true` as the second argument when creating the logger:

```javascript
var log = require('cli-logger');
var conf = {level: log.BW_INFO|log.BW_FATAL};
logger = log(conf, true);
logger.info('mock %s message', 'info');
```

If you just want to disable one or two log levels it is more convenient to use the `XOR` operator:

```javascript
var log = require('cli-logger');
var conf = {level: log.BW_ALL^log.BW_TRACE};
logger = log(conf, true);
logger.info('mock %s message', 'info');
```

Note that in normal mode you may use string log levels, such as `'trace'`, but in bitwise mode you may only use integer log levels.

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


### Streams

Configuring output streams is typically done using an array, but as a convenience an object may be specified to configure a single output stream:

```javascript
var log = require('cli-logger');
var conf = {streams: {stream: process.stderr, level: log.WARN}}
var logger = log(conf);
// ...
```

#### File

You may configure a file stream by using the `path` stream property. For example, to log the `INFO` level and above to `stdout` and `ERROR` and above to a file:

```javascript
var log = require('cli-logger');
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
var logger = log(conf);
// ...
```

When creating file streams the default flags used is `a` you may specify the `flags` property to change this behaviour:

```javascript
var log = require('cli-logger');
var conf = {streams: [
  {
    path: 'log/errors.log',
    flags: 'ax',
    level: log.ERROR
  }
]};
var logger = log(conf);
// ...
```

The `encoding` and `mode` options supported by `fs.createWriteStream` are also respected if present.

## License

Everything is [MIT](http://en.wikipedia.org/wiki/MIT_License). Read the [license](/LICENSE) if you feel inclined.

[ttycolor]: https://github.com/freeformsystems/ttycolor
[bunyan]: https://github.com/trentm/node-bunyan

[bin]: https://github.com/freeformsystems/cli-logger/tree/master/bin
[test suite]: https://github.com/freeformsystems/cli-logger/tree/master/test/unit
