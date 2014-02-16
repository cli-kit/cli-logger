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

* `name`: The name of the logger, default is `basename(process.argv[1])`.
* `json`: Print log records as newline delimited JSON, default is `false`.
* `level`: A default log level to use when a stream does not explicitly specify a log level, default is `INFO`.
* `src`: A boolean that indicates that file name, line number and function name (when available) should be included in the log record, default is `false`.
* `stack`: A boolean used in conjunction with `src` to also include an array of the stack trace caller information, default is `false`.
* `console`: A boolean indicating that console methods should be used when writing log records, this enables the [ttycolor][ttycolor] integration, default is `false`.
* `streams`: An array or object that configures the streams that log records are written to, by default if this property is not present a single stream is configured for `process.stdout`.

If you specify any unknown properties in the configuration then these are considered *persistent fields* and are added to every log record. This is a convenient way to add labels for sub-components to log records.

## Streams

Configuring output streams is typically done using an array, but as a convenience an object may be specified to configure a single output stream:

```javascript
var log = require('cli-logger');
var conf = {streams: {stream: process.stderr, level: log.WARN}}
var logger = log(conf);
// ...
```

### File

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
