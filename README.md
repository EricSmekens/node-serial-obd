serial-obd 0.3.0
===============

This version is a fork of [Eric Smekens repository](https://github.com/EricSmekens/node-serial-obd) with a rewritten queuing system and some other additional features.

I did this due to queue overflow conditions I was experiencing in combination with the ELM327 clone device I was using and the slow response from my car's ECU when the ignition was not turned on.

# Overview of changes in this fork

## New Queuing System

The queuing system works as follows:

1. When `startPolling()` is called, all named codes added using `addPoller()`
will be added to the queue.
2. The queue will send its first command
3. If the command is not a request for data (i.e. AT command), on receipt of a
response, the next command in the queue is sent
4. If however, the command is a request for data from the ECU, when the response
is received, the same command will be appended to the end of the queue, if that
command appears in the activepollers list.  If not, meaning the command was
issued using `requestValueByName()`, then the command is not added back into the queue
5. If an error is received in response to a request for data, the command is still
added to the end of the queue
6. If all polled commands have values of null (meaning the last response for that command was NO DATA), then the ECU will be deemed no longer available (i.e. the engine was turned off, and the ignition is no longer on), and OBD will switch to an `UNABLE TO CONNECT` state.

## New event emitters

The `dataReceived` event emitter remains unchanged.  So if you were using the original fork, then your code should continue to work with this event. 

However, this fork will emit additional events as follows:

### ecu
When there is a response from the ELM327 that relates to the ECU itself, rather
than specifically to do with a command issued, then that response will be emitted
on `ecu`.  Examples include:

* SEARCHING...
* UNABLE TO CONNECT
* BUS BUSY
* CAN ERROR
* NO DATA

### data
The library now internally keeps track of the last received value for each named command that is polled from the ECU. The `data` event contains an object with the property names matching the names of codes to poll. When calling `startPolling()`, the frequency in which this event is emitted is passed as a parameter given in milliseconds.

### name-based events
For each name that you add for polling, on receipt of data for that named code
the value will be emitted with that name.  For example, if you call `addPoller('vss')`, then a `vss` event will be emitted each time the ECU returns the latest vss value.  See the [Advanced Usage](#advanced-usage) section.

# Serial communication for OBD-II ELM327 devices.
This node module lets you communicate over a serial port with OBD-II ELM327 Connectors using Node.js.

# Limitations
* Only tested on Raspbian Jessie
* Only tested with ELM327 v1.5 serial device.
* Not all OBD-II Commands are implemented yet.

If you have a bluetooth OBD-II adapter, use [bluetooth-obd](https://github.com/EricSmekens/node-bluetooth-obd).

# Pre-requests
* You might need to run it with SUDO! (If it says: serial port X is not ready!), or better still, create a udev rule that assigns permissions to the serial device file appropriate for your user account.

# Install
```bash
npm install serial-obd
```

# Documentation

## Basic Usage

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

## Advanced Usage

```javascript
var OBDReader = require('serial-obd');
var options = {};
options.baudrate = 38400;
var serialOBDReader = new OBDReader("/dev/ttyUSB0", options);
var dataReceivedMarker = {};

serialOBDReader.on('dataReceived', function (data) {
    console.log('dataReceived: '+JSON.stringify(data));
    dataReceivedMarker = data;
});

serialOBDReader.on('data', function (data) {
  console.log('data: ' + JSON.stringify(data));
});

serialOBDReader.on('ecu', function (data) {
  console.log('ecu: ' + data);
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

serialOBDReader.on('load_pct', function (data) {
  console.log('load_pct: ' + data);
});

serialOBDReader.on('map', function (data) {
  console.log('map: ' + data);
});

serialOBDReader.on('frp', function (data) {
  console.log('frp: ' + data);
});

serialOBDReader.on('connected', function (data) {
    //this.requestValueByName("vss"); //vss = vehicle speed sensor

    this.addPoller("vss");
    this.addPoller("rpm");
    this.addPoller("temp");
    this.addPoller("load_pct");
    this.addPoller("map");
    this.addPoller("frp");

    this.startPolling(500);
});

serialOBDReader.on('error', function (data) {
  console.log('Error: ' + data);
	process.exit(1);
});

//serialOBDReader.on('debug', function (data) {
  //console.log('Debug: ' + data);
//});


serialOBDReader.connect();
```

This generates the following output, but with the engine not cranking (hence, 0 for rpm and vss).  Note also my vehicle (Australian-made [Ford Territory](https://en.wikipedia.org/wiki/Ford_Territory) does not support the `frp` command).

```
pi@raspberrypi:~/node-serial-obd/example $ node test.js 
data: {"vss":null,"rpm":null,"temp":null,"load_pct":null,"map":null,"frp":null}
ecu: ELM327 v1.5
ecu: OK
ecu: OK
ecu: OK
ecu: OK
ecu: OK
ecu: OK
ecu: OK
data: {"vss":null,"rpm":null,"temp":null,"load_pct":null,"map":null,"frp":null}
ecu: SEARCHING...
vss: 0
dataReceived: {"mode":"41","pid":"0D","name":"vss","value":0}
rpm: 0
dataReceived: {"mode":"41","pid":"0C","name":"rpm","value":0}
temp: 36
dataReceived: {"mode":"41","pid":"05","name":"temp","value":36}
load_pct: 0
dataReceived: {"mode":"41","pid":"04","name":"load_pct","value":0}
map: 100
dataReceived: {"mode":"41","pid":"0B","name":"map","value":100}
ecu: NO DATA
vss: 0
dataReceived: {"mode":"41","pid":"0D","name":"vss","value":0}
rpm: 0
dataReceived: {"mode":"41","pid":"0C","name":"rpm","value":0}
temp: 36
dataReceived: {"mode":"41","pid":"05","name":"temp","value":36}
load_pct: 0
dataReceived: {"mode":"41","pid":"04","name":"load_pct","value":0}
map: 100
dataReceived: {"mode":"41","pid":"0B","name":"map","value":100}
ecu: NO DATA
data: {"vss":0,"rpm":0,"temp":36,"load_pct":0,"map":100,"frp":null}
vss: 0
dataReceived: {"mode":"41","pid":"0D","name":"vss","value":0}
rpm: 0
dataReceived: {"mode":"41","pid":"0C","name":"rpm","value":0}
temp: 36
dataReceived: {"mode":"41","pid":"05","name":"temp","value":36}
load_pct: 0
dataReceived: {"mode":"41","pid":"04","name":"load_pct","value":0}
map: 100
dataReceived: {"mode":"41","pid":"0B","name":"map","value":100}
ecu: NO DATA
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
	* BUS BUSY
	* CAN ERROR

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


# LICENCE

The original code-base from which this version is forked is licenced under the terms of the Apache 2.0 licence.  This fork is being relicensed (as permitted by the Apache 2.0 licence) under the terms of the GPLv3. 

With the exception of the [obdInfo.js](blob/master/lib/obdInfo.js) file, this work is Copyright (c) 2016 Damien Clark, [Damo's World](https://damos.world)<br/> <br/>
Licenced under the terms of the
[GPLv3](https://www.gnu.org/licenses/gpl.txt)<br/>
![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png "GPLv3")

The [obdInfo.js](blob/master/lib/obdInfo.js) file is copyright (c) 2013 [Eric Smekens](https://github.com/EricSmekens).

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL DAMIEN CLARK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Acknowledgements
I'd like to acknowledge the efforts of [Eric Smekens](https://github.com/EricSmekens) in the creation of his [node-serial-obd](https://github.com/EricSmekens/node-serial-obd) library, on which this library is based.  In particular, I would like thank Eric for his work on decoding ELM327 response codes, which I have reproduced in this library verbatim under the generous Apache licence Eric has used.  

