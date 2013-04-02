serial-obd
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


# This is an alpha version, so don't expect it to work.

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
    //Time passes
    this.stopPolling();
});


serialOBDReader.connect(); //Connect
```
## API

###OBDReader

#### Event: ('dataReceived', data)

Emitted when data is read from the OBD-II connector.

* data - the data that was read and parsed to a reply object

#### Event: ('connected')

Emitted when the connection is set up (port is open).

* data - the data that was read and parsed to a reply object

#### OBDReader()

Creates an OBDReader.

#### OBDReader.connect()

Opens the port and adds all events.

#### OBDReader.connect(bluetoothAddress[, successCallback, errorCallback])

Connects to a remote bluetooth device.

* bluetoothAddress - the address of the remote Bluetooth device.
* [successCallback] - called when a connection has been established.
* [errorCallback(msg)] - called when the connection attempt results in an error.

#### OBDReader.close()

Closes the port. Rfcomm connection will remain open.

#### OBDReader.write(message)

Writes a string to the serial port connection.

* message - the OBD-II or ELM command-string to be written to the port.

#### OBDReader.requestValueByName(name)

Converts a PID name to an actual PID-string and writes it to the serial port connection.

* name - the OBD-II name of the PID you want to request.

#### OBDReader.addPoller(name)

Adds a PID name that will be polled frequently.

* name - the OBD-II name of the PID you want to be polled.

#### OBDReader.removePoller(name)

Removes a PID name that will be removed from the activePollers.

* name - the OBD-II name of the PID you want to be removed.

#### OBDReader.removeAllPollers(name)

Removes all the pollers.

#### OBDReader.startPolling(name)

Start polling the pollers you added with addPoller().

#### OBDReader.stopPolling(name)

Stops polling.

# LICENSE

This module is available under a [FreeBSD license](http://opensource.org/licenses/BSD-2-Clause), see also the [LICENSE file](https://raw.github.com/eelcocramer/node-bluetooth-serial-port/master/LICENSE) for details.




