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

Unless [streams](#streams) have been configured all logging is routed to `process.stdout`.

### Normal

Normal usage uses log levels that correspond to the [bunyan][bunyan] log levels:

```javascript
var log = require('cli-logger');
logger = log();
logger.info('mock %s message', 'info');
```

### Bitwise

Using bitwise log levels allows fine-grained control of how log messages are routed:

```javascript
var log = require('cli-logger');
var conf = {level: log.BW_INFO|log.BW_FATAL};
logger = log(conf, true);
logger.info('mock %s message', 'info');
```

## Streams

TODO

## License

Everything is [MIT](http://en.wikipedia.org/wiki/MIT_License). Read the [license](/LICENSE) if you feel inclined.

[ttycolor]: https://github.com/freeformsystems/ttycolor
[bunyan]: https://github.com/trentm/node-bunyan
