# serial-obd 0.2.2

This version will only receive updates that were done in bluetooth-obd. On request I will update/sync this module with bluetooth-obd as this version is less-used.

# Serial communication for OBD-II ELM327 devices.

This node module lets you communicate over a serial port with OBD-II ELM327 Connectors using Node.js.

# Limitations

-   Only tested on Ubuntu and Windows 10.
-   Only tested with rfcomm, and not with actual serial port yet.
-   Only tested on ELM327 devices.
-   Not all OBD-II Commands are implemented yet.

## Use bluetooth-obd if you use a bluetooth OBD-II Connector!

# Pre-requests

-   If it's a Bluetooth ELM327, then it should already be paired and connected with rfcomm connect!
-   You might need to run it with SUDO! (If it says: serial port X is not ready!)

# Install

`npm install serial-obd`

# Documentation

## Basic usage

```javascript
import OBDReader from "../lib/obd.js";
const options = {};
options.baudRate = 115200;
const serialOBDReader = new OBDReader("COM4", options);
let dataReceivedMarker = {};

serialOBDReader.on("dataReceived", (data) => {
    console.log(data);
    dataReceivedMarker = data;
});

serialOBDReader.on("connected", (_data) => {
    //this.requestValueByName("vss"); //vss = vehicle speed sensor

    serialOBDReader.addPoller("vss");
    serialOBDReader.addPoller("rpm");
    serialOBDReader.addPoller("temp");
    serialOBDReader.addPoller("load_pct");
    serialOBDReader.addPoller("map");
    serialOBDReader.addPoller("frp");

    serialOBDReader.startPolling(1000);
});

serialOBDReader.connect();
```

## API

### OBDReader

#### Event: ('dataReceived', data)

Emitted when data is read from the OBD-II connector.

-   data - the data that was read and parsed to a reply object

#### Event: ('connected')

Emitted when the connection is set up (port is open).

#### Event: ('debug', message)

Emitted for debug purposes.

-   message - the debug message

#### OBDReader(portName, options)

Creates an instance of OBDReader.

##### Params:

-   **string** _portName_ Port that will be connected to. For example: &quot;/dev/rfcomm0&quot;

-   **Object** _options_ Object that contains options, e.g.: baudrate, databits, stopbits, flowcontrol. Same options serialport module uses.

#### getPIDByName(Name)

Find a PID-value by name.

##### Params:

-   **name** _Name_ of the PID you want the hexadecimal (in ASCII text) value of.

##### Return:

-   **string** PID in hexadecimal ASCII

#### parseOBDCommand(hexString)

Parses a hexadecimal string to a reply object. Uses PIDS. (obdInfo.js)

##### Params:

-   **string** _hexString_ Hexadecimal value in string that is received over the serialport.

##### Return:

-   **Object** reply - The reply.

-   **string** reply.value - The value that is already converted. This can be a PID converted answer or &quot;OK&quot; or &quot;NO DATA&quot;.

-   **string** reply.name - The name. --! Only if the reply is a PID.

-   **string** reply.mode - The mode of the PID. --! Only if the reply is a PID.

-   **string** reply.pid - The PID. --! Only if the reply is a PID.

#### connect()

Connect/Open the serial port and add events to serialport. Also starts the intervalWriter that is used to write the queue.

#### disconnect()

Disconnects/closes the port.

#### write(message, replies)

Writes a message to the port. (Queued!) All write functions call this function.

##### Params:

-   **string** _message_ The PID or AT Command you want to send. Without \r or \n!
-   **number** _replies_ The number of replies that are expected. Default = 0. 0 --> infinite

#### requestValueByName(name)

Writes a PID value by entering a pid supported name.

##### Params:

-   **string** _name_ Look into obdInfo.js for all PIDS.

#### addPoller(name)

Adds a poller to the poller-array.

##### Params:

-   **string** _name_ Name of the poller you want to add.

#### removePoller(name)

Removes an poller.

##### Params:

-   **string** _name_ Name of the poller you want to remove.

#### removeAllPollers()

Removes all pollers.

#### writePollers()

Writes all active pollers.

#### startPolling()

Starts polling. Lower interval than activePollers \* 50 will probably give buffer overflows.

##### Params:

-   **number** _interval_ Frequency how often all variables should be polled. (in ms) If no value is given, then for each activePoller 75ms will be added.

#### stopPolling()

Stops polling.

# LICENSE

This module is available under a [Apache 2.0 license](http://www.apache.org/licenses/LICENSE-2.0.html), see also the [LICENSE file](https://raw.github.com/EricSmekens/node-serial-obd/master/LICENSE) for details.
