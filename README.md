serial-obd 0.3.0
===============

This version will only receive updates that were done in bluetooth-obd. On request I will update/sync this module with bluetooth-obd as this version is less-used.

# Serial communication for OBD-II ELM327 devices.
This node module lets you communicate over a serial port with OBD-II ELM327 Connectors using Node.js.

# Limitations
* Only tested on Raspbian Jessie
* Only tested with ELM327 v1.5 serial device.
* Not all OBD-II Commands are implemented yet.

## Use bluetooth-obd if you use a bluetooth OBD-II Connector!

# Pre-requests
* If it's a Bluetooth ELM327, then it should already be paired and connected with rfcomm connect!
* You might need to run it with SUDO! (If it says: serial port X is not ready!)

# Install
`npm install serial-obd`
# Documentation

## Basic usage

```javascript
var OBDReader = require('serial-obd');
var options = {};
var serialOBDReader = new OBDReader("/dev/ttyUSB0", options);
var dataReceivedMarker = {};

serialOBDReader.on('data', function (data) {
    console.log('data: '+JSON.stringify(data));
    dataReceivedMarker = data;
});

serialOBDReader.on('connected', function (data) {
    this.addPoller("vss");
    this.addPoller("rpm");
    this.addPoller("temp");
    this.addPoller("load_pct");
    this.addPoller("map");
    this.addPoller("frp");

    this.startPolling(2000); //Polls all added pollers each 2000 ms.
});

serialOBDReader.connect();
```

or

```javascript
var OBDReader = require('serial-obd');
var options = {};
options.baudrate = 115200;
var serialOBDReader = new OBDReader("COM4", options);
var dataReceivedMarker = {};

serialOBDReader.on('dataReceived', function (data) {
    console.log('dataReceived: '+JSON.stringify(data));
    dataReceivedMarker = data;
});

serialOBDReader.on('vss', function (data) {
  console.log('vss: ' + data);
});

serialOBDReader.on('rpm', function (data) {
  console.log('rpm: ' + data);
});

serialOBDReader.on('temp', function (data) {
  console.log('temp: ' + data);
});

serialOBDReader.on('frp', function (data) {
  console.log('frp: ' + data);
});

serialOBDReader.on('connected', function (data) {
    //this.requestValueByName("vss"); //vss = vehicle speed sensor

    this.addPoller("vss");
    this.addPoller("rpm");
    this.addPoller("temp");
    this.addPoller("frp");

    this.startPolling(500);
});

serialOBDReader.on('error', function (data) {
  console.log('Error: ' + data);
	process.exit(1);
});

serialOBDReader.on('debug', function (data) {
  console.log('Debug: ' + data);
});

serialOBDReader.connect();

```

This generates the following output.  Note my vehicle (Australian-made [Ford Territory](https://en.wikipedia.org/wiki/Ford_Territory) does not support the `FRP` command).

```
ecu: ELM327 v1.5
ecu: OK
ecu: OK
ecu: OK
ecu: OK
ecu: OK
ecu: OK
ecu: SEARCHING...
vss: 0
dataReceived: {"mode":"41","pid":"0D","name":"vss","value":0}
rpm: 0
dataReceived: {"mode":"41","pid":"0C","name":"rpm","value":0}
temp: 29
dataReceived: {"mode":"41","pid":"05","name":"temp","value":29}
map: 99
dataReceived: {"mode":"41","pid":"0B","name":"map","value":99}
ecu: NO DATA
vss: 0
dataReceived: {"mode":"41","pid":"0D","name":"vss","value":0}
rpm: 0
dataReceived: {"mode":"41","pid":"0C","name":"rpm","value":0}
temp: 29
dataReceived: {"mode":"41","pid":"05","name":"temp","value":29}
map: 99
dataReceived: {"mode":"41","pid":"0B","name":"map","value":99}
ecu: NO DATA
data: {"vss":0,"rpm":0,"temp":29,"load_pct":0,"map":99,"frp":null}
```
## API

###OBDReader

#### Event: ('dataReceived', data)

Emitted when data is read from the ECU.

* data - the data that was read and parsed to a reply object

#### Event: ('data', data)

Emitted when polled according to the interval passed to startPolling().

* data - contains an object with property names matching the names given by addPoller() and the values most recently retrieved from the ECU.

#### Event: (name, data)

Emitted when the value for the command given by `name` is read from the ECU.

* data - contains the parsed value for the given command. 

#### Event: ('ecu', data)

Emitted when any operational responses received from the ECU. 

* data - the following responses are emitted:
	* NO DATA
	* OK
	* ?
	* UNABLE TO CONNECT
	* SEARCHING...
	* ELM327 {version}

#### Event: ('connected')

Emitted when the connection is set up (port is open).

* data - the data that was read and parsed to a reply object

#### OBDReader(portName, options)

Creates an instance of OBDReader.

##### Params:

* **string** *portName* Port that will be connected to. For example: &quot;/dev/ttyUSB0&quot;

* **Object** *options* Object that contains options, e.g.: baudrate, databits, stopbits, flowcontrol. Same options serialport module uses.

#### connect()

Connect/Open the serial port and add events to serialport. Also starts the intervalWriter that is used to write the queue.

#### disconnect()

Disconnects/closes the port.

#### write(message, name, replies)

Writes a message to the port. (Queued!) All write functions call this function.

##### Params:

* **string** *message* The PID or AT Command you want to send. Without \r or \n!
* **string** *name* Optionally, the name of the PID Command you want to send. Without \r or \n!
See obdInfo.js for all names
* **number** *replies* The number of replies that are expected. Default = 0. 0 --> infinite

#### requestValueByName(name)

Writes a PID value by entering a pid supported name.

##### Params:

* **string** *name* Look into obdInfo.js for all PIDS.

#### addPoller(name)

Adds a poller to the poller-array.

##### Params:

* **string** *name* Name of the poller you want to add.

#### removePoller(name)

Removes an poller.

##### Params:

* **string** *name* Name of the poller you want to remove.

#### removeAllPollers()

Removes all pollers.

#### writePollers()

Writes all active pollers.

#### startPolling()

Starts polling. Lower interval than activePollers * 50 will probably give buffer overflows.

##### Params:

* **number** *interval* Frequency how often all variables should be polled. (in ms) If no value is given, then for each activePoller 75ms will be added.

#### stopPolling()

Stops polling.

### Private Functions

#### getPIDByName(Name)

Find a PID-value by name.

##### Params: 

* **string** *Name* of the PID you want the hexadecimal (in ASCII text) value of.

##### Return:

* **string** PID in hexadecimal ASCII

#### getNameByPID(pid)

Find the name for a command previously issued to the ECU.

##### Params: 

* **string** *pid* pid command including mode and optional reply count expressed as hexadecimal (in ASCII text) previously issued to the ECU.

##### Return:

* **string** name or throws if not found.

#### parseOBDCommand(hexString)

Parses a hexadecimal string to a reply object. Uses PIDS. (obdInfo.js)

##### Params: 

* **string** *hexString* Hexadecimal value in string that is received over the serialport.

##### Return:

* **Object** reply - The reply.

* **string** reply.value - The value that is already converted. This can be a PID converted answer or &quot;OK&quot; or &quot;NO DATA&quot;.

* **string** reply.name - The name. --! Only if the reply is a PID.

* **string** reply.mode - The mode of the PID. --! Only if the reply is a PID.

* **string** reply.pid - The PID. --! Only if the reply is a PID.


# LICENSE

This module is available under a [Apache 2.0 license](http://www.apache.org/licenses/LICENSE-2.0.html), see also the [LICENSE file](https://raw.github.com/EricSmekens/node-serial-obd/master/LICENSE) for details.
