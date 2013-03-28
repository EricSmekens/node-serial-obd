node-serial-obd
===============

# Serial communication for OBD-II ELM327 devices.
This node module lets you communicate over a serial port with OBD-II ELM327 Connectors using Node.js.
# Limitations
* Only tested on Linux
* Only available on Linux and BSD like systems
* Only tested with rfcomm, and not with ttyS0 yet.
* Only tested on ELM327 devices.
* --WORK IN PROGRESS-- For the moment communicates with /dev/rfcomm0.
* Not all OBD-II Commands are implemented yet.

# Pre-requests
* If it's a Bluetooth ELM327, then it should already be paired and connected with rfcomm connect!
# Install
`npm install node-serial-obd`
# Documentation
## Basic usage

```javascript
var OBDReader = require('node-serial-obd');
var serialOBDReader = new OBDReader();
var dataReceivedMarker = new Object();

serialOBDReader.on('dataReceived', function(data){
    console.log(data);
});

serialOBDReader.on('connected', function(data){
    this.requestValueByName("vss"); //vss = vehicle speed sensor

    this.addPoller("vss");
    this.addPoller("rpm");
    this.addPoller("temp");
    this.startPolling();
});


serialOBDReader.connect();
```
## API

###Coming soon

## LICENSE

This module is available under a [FreeBSD license](http://opensource.org/licenses/BSD-2-Clause), see also the [LICENSE file](https://raw.github.com/eelcocramer/node-bluetooth-serial-port/master/LICENSE) for details.




