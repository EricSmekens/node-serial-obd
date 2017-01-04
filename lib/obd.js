/*******************************************************************************
Unless otherwise noted, this code is:
Copyright (c) 2016 Damien Clark, (https://damos.world)
Licenced under the terms of the GPLv3+

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
******************************************************************************/

'use strict';
//Used for event emitting.
var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * obdInfo.js for all PIDS.
 * @type {*}
 */
var PIDS = require('../lib/obdInfo.js');

/**
 * Queue for writing
 * @type {Array}
 */
var queue = [];

/**
 * Property list mapping pid commands to names
 * @type {Object}
 */
var names = {};

var lastSentCommand = '';

// Class OBDReader
var OBDReader;

/**
* Creates an instance of OBDReader.
* @constructor
* @param {string} portName Port that will be connected to. For example: "/dev/rfcomm0"
* @param {Object} options Object that contains options, e.g. baudrate, databits. Same options serialport module uses.
* @this {OBDReader}
*/
OBDReader = function (portName, options) {

    EventEmitter.call(this);
    this.connected = false;
    this.online = true;
    this.polling = false;
    this.data = {};
    this.receivedData = "";
    this.awaitingReply = false;
    this.SERIAL_PORT = portName;
    this.OPTIONS = options;

    return this;
};
util.inherits(OBDReader, EventEmitter);

/**
 * Find a PID-value by name.
 * @param name Name of the PID you want the hexadecimal (in ASCII text) value of.
 * @return {string} PID in hexadecimal ASCII
 */
function getPIDByName(name) {
    var i;
    for (i = 0; i < PIDS.length; i++) {
        if (PIDS[i].name === name) {
            if (PIDS[i].pid !== undefined) {
                return (PIDS[i].mode + PIDS[i].pid);
            }
            //There are modes which don't require a extra parameter ID.
            return (PIDS[i].mode);
        }
    }
}

/**
 * Find a name based on a command sent
 * @param pid Command sent including the mode and optionally number of replies expressed as hexadecimal using string
 *
 * @return {string} Name related to the PID provided
 */
function getNameByPID(pid) {
    if(names[pid] === undefined) {
        throw "PID not found: "+pid;
    }
    return names[pid];
}
/**
 * Parses a hexadecimal string to a reply object. Uses PIDS. (obdInfo.js)
 * @param {string} hexString Hexadecimal value in string that is received over the serialport.
 * @return {Object} reply - The reply.
 * @return {string} reply.value - The value that is already converted. This can be a PID converted answer or "OK" or "NO DATA".
 * @return {string} reply.name - The name. --! Only if the reply is a PID.
 * @return {string} reply.mode - The mode of the PID. --! Only if the reply is a PID.
 * @return {string} reply.pid - The PID. --! Only if the reply is a PID.
 */
function parseOBDCommand(hexString) {
    var reply,
        byteNumber,
        valueArray; //New object

    reply = {};
    if (hexString === "NO DATA" || hexString === "OK" || hexString === "?" || hexString === "UNABLE TO CONNECT" || hexString === "SEARCHING..." || hexString.startsWith('ELM327')) {
        //No data or OK is the response. Return directly.
        reply.value = hexString;
        return reply;
    }

    hexString = hexString.replace(/ /g, ''); //Whitespace trimming //Probably not needed anymore?
    valueArray = [];

    for (byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
        valueArray.push(hexString.substr(byteNumber, 2));
    }

    if (valueArray[0] === "41") {
        reply.mode = valueArray[0];
        reply.pid = valueArray[1];
        for (var i = 0; i < PIDS.length; i++) {
            if (PIDS[i].pid == reply.pid) {
                var numberOfBytes = PIDS[i].bytes;
                reply.name = PIDS[i].name;
                switch (numberOfBytes) {
                    case 1:
                        reply.value = PIDS[i].convertToUseful(valueArray[2]);
                        break;
                    case 2:
                        reply.value = PIDS[i].convertToUseful(valueArray[2], valueArray[3]);
                        break;
                    case 4:
                        reply.value = PIDS[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5]);
                        break;
                    case 8:
                        reply.value = PIDS[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6], valueArray[7], valueArray[8], valueArray[9]);
                        break;
                }
                break; //Value is converted, break out the for loop.
            }
        }
    } else if (valueArray[0] === "43") {
        reply.mode = valueArray[0];
        for (var i = 0; i < PIDS.length; i++) {
            if (PIDS[i].mode == "03") {
                reply.name = PIDS[i].name;
                reply.value = PIDS[i].convertToUseful(valueArray[1], valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6]);
            }
        }
    }
    return reply;
}
/**
 * Connect/Open the serial port and add events to serial-port.
 * Also starts the .pushWriter that is used to write the queue.
 * @this {OBDReader}
 */
OBDReader.prototype.connect = function () {
    var self = this; //Enclosure

    var SerialPort = require('serialport');

    this.serial = new SerialPort(this.SERIAL_PORT, this.OPTIONS);

    this.serial.on('close', function (err) {
        console.log("Serial port [" + self.SERIAL_PORT + "] was closed");
    });

    this.serial.on('error', function (err) {
        self.emit("error","Serial port [" + self.SERIAL_PORT + "] is not ready");
    });

    this.serial.on('open', function () {
        self.connected = true;

        self.write('ATZ');
        //Turns off echo.
        self.write('ATE0');
        //Turns off extra line feed and carriage return
        self.write('ATL0');
        //This disables spaces in in output, which is faster!
        self.write('ATS0');
        //Turns off headers and checksum to be sent.
        self.write('ATH0');
        //Turn adaptive timing to 2. This is an aggressive learn curve for adjusting the timeout. Will make huge difference on slow systems.
        self.write('ATAT2');
        //Set timeout to 10 * 4 = 40msec, allows +20 queries per second. This is the maximum wait-time. ATAT will decide if it should wait shorter or not.
        self.write('ATST0A');
        //Set the protocol to automatic.
        self.write('ATSP0');

        //Event connected
        self.emit('connected');
    });

    this.serial.on('data', function (data) {
        var currentString, arrayOfCommands;
        currentString = self.receivedData + data.toString('utf8'); // making sure it's a utf8 string

        arrayOfCommands = currentString.split('>');

        var forString;
        if (arrayOfCommands.length < 2) {
            self.receivedData = arrayOfCommands[0];
        } else {
            for (var commandNumber = 0; commandNumber < arrayOfCommands.length; commandNumber++) {
                forString = arrayOfCommands[commandNumber];
                if (forString === '') {
                    continue;
                }

                var multipleMessages = forString.split('\r');
                for (var messageNumber = 0; messageNumber < multipleMessages.length; messageNumber++) {
                    var messageString = multipleMessages[messageNumber];
                    if (messageString === '') {
                        continue;
                    }

                    self.emit('debug', 'in    ' + messageString);

                    var reply;
                    reply = parseOBDCommand(messageString);
                    switch(reply.value) {
                        case "SEARCHING...":
                            self.emit("ecu",reply.value);
                            continue; // Just an alert, not a response
                        case "UNABLE TO CONNECT":
                            if(self.online) {
                                self.online = false;
                            }
                        case "BUS BUSY":
                        case "CAN ERROR":
                        case "NO DATA":
                            self.emit("ecu",reply.value);
                            // If no data received, then ECU could be offline
                            // so if the last command was not an AT command
                            // requeue it, so we can try again for it in case
                            // the ecu comes online
                            if(lastSentCommand.match(/AT/i) === null) {
                                var name = getNameByPID(lastSentCommand);
                                // But only requeue if it is a member of the
                                // activePollers list
                                if(activePollers.indexOf(name) !== -1) {
                                    self.data[name] = null;
                                    self.write(lastSentCommand);
                                }
                            }
                            break;
                        default:
                            if(!reply.hasOwnProperty('name') && reply.hasOwnProperty('value')) {
                                self.emit("ecu",reply.value);
                            }
                            break;
                    }

                    if(reply.hasOwnProperty('name')) {
                        self.online = true;
                        // Update our data if 'name' is on our activePollers
                        // list
                        if(activePollers.indexOf(reply.name) !== -1) {
                            self.data[reply.name] = reply.value;
                        }
                        // Emit event with pid name
                        self.emit(reply.name, reply.value);
                        // Emit 'dataReceived' as original function
                        self.emit('dataReceived',reply);
                        // Add this pid back into the queue if part of
                        // activePollers list
                        if(activePollers.indexOf(reply.name) !== -1) {
                            self.write(lastSentCommand);
                        }
                    }
                    
                    if (self.awaitingReply) {
                        self.awaitingReply = false;
                    }

                    if(self.polling) {
                        // Wait until the end of this of the Node.js event loop
                        // before processing the next queue item, giving the
                        // ELM327 a bit of time to be ready
                        setImmediate(function() {
                            self.emit('processQueue');
                        }) ;
                    }
                    self.receivedData = '';
                }
            }
        }
    });

    //this.serial = serial; //Save the connection in OBDReader object.
    this.on('processQueue', function () {
        if (self.awaitingReply == true) {
            self.emit('debug', 'processQueue: awaitingReply true');
        } else {
            if (queue.length > 0 && self.connected) {
                try {
                    self.awaitingReply = true;
                    var command = queue.shift();
                    lastSentCommand = command;
                    self.emit('debug', 'out   ' + command);
                    self.serial.write(command + '\r');
                } catch (err) {
                    console.log('Error while writing: ' + err);
                    console.log('OBD-II Listeners deactivated, connection is probably lost.');
                    self.removeAllPollers();
                }
            }
        }
    });
    return this;
};

/**
 * Disconnects/closes the port.
 * @this {OBDReader}
 */
OBDReader.prototype.disconnect = function () {
    clearInterval(this.intervalWriter);
    queue.length = 0; //Clears queue
    this.serial.close();
    this.connected = false;
};

/**
 * Writes a message to the port. (Queued!) All write functions call this function.
 * @this {OBDReader}
 * @param {string} message The PID or AT Command you want to send. Without \r or \n!
 * @param {string} name The name of the PID you want to send. Omit if issuing AT command
 * @param {number} replies The number of replies that are expected. Default = 0. 0 --> infinite
 * AT Messages --> Zero replies!!
 */
OBDReader.prototype.write = function (message, name, replies) {
    if (replies === undefined) {
        replies = 0;
    }
    if (this.connected) {
        if (queue.length < 256) {
            if (replies !== 0) {
                message += replies;
            }
            if(name !== undefined) {
                names[message] = name;
            }
            this.emit('debug', 'queue ' + message);
            queue.push(message);

            if (this.awaitingReply === false) {
                this.emit('processQueue');
            }

        } else {
            throw "Queue-overflow!";
        }
    } else {
        throw "OBD Serial device is not connected.";
    }
    this.emit('debug','queue contains: '+queue.join(','));
};

/**
 * Writes a PID value by entering a pid supported name.
 * @this {OBDReader}
 * @param {string} name Look into obdInfo.js for all PIDS.
 */
OBDReader.prototype.requestValueByName = function (name) {
    var stringToSend = getPIDByName(name);
    //names[stringToSend+'1'] = name;
    this.write(stringToSend,name);
};

var activePollers = [];
/**
 * Adds a poller to the poller-array.
 * @this {OBDReader}
 * @param {string} name Name of the poller you want to add.
 */
OBDReader.prototype.addPoller = function (name) {
    activePollers.push(name);
    this.data[name] = null;
    if(this.polling) {
        var stringToSend = getPIDByName(name);
        this.write(stringToSend,name,1);
    }
};
/**
 * Removes an poller.
 * @this {OBDReader}
 * @param {string} name Name of the poller you want to remove.
 */
OBDReader.prototype.removePoller = function (name) {
    // Remove from our pollers list
    var index = activePollers.indexOf(name);
    activePollers.splice(index, 1);
    // Remove from the running queue
    if(this.polling) {
        index = queue.indexOf(getPIDByName(name)+'1');
        queue.splice(index,1);
    }
    // Remove from our data object
    delete this.data[name];
};
/**
 * Removes all pollers.
 * @this {OBDReader}
 */
OBDReader.prototype.removeAllPollers = function () {
    activePollers.length = 0; //This does not delete the array, it just clears every element.
};
/**
 * Writes all active pollers.
 * @this {OBDReader}
 */
OBDReader.prototype.writePollers = function () {
    var i;
    for (i = 0; i < activePollers.length; i++) {
        var stringToSend = getPIDByName(activePollers[i]);
        this.write(stringToSend,activePollers[i],1);
    }
};

var pollerInterval;
/**
 * Starts polling. 
 * @this {OBDReader}
 * @param {number} interval Frequency how often all variables should be emitted. (in ms). If no value is given, defaults to 1 second.
 */
OBDReader.prototype.startPolling = function (interval) {
    this.polling = true;
    this.writePollers();
    if (interval === undefined) {
        interval = 1000; // Default polling for data to 1 second
    }

    var self = this;
    pollerInterval = setInterval(function () {
        self.emit("data",self.data);
    }, interval);
};
/**
 * Stops polling.
 * @this {OBDReader}
 */
OBDReader.prototype.stopPolling = function () {
    this.polling = false;
    this.queue.length = 0;
    clearInterval(pollerInterval);
};

var exports = module.exports = OBDReader;
