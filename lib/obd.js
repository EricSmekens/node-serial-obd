'use strict';

//var async       = require('async');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var PIDS = require('../lib/obdInfo.js');

// Class OBDReader
var OBDReader;
OBDReader = function () {

    EventEmitter.call(this);
    this.connected = false;
    this.receivedData = "";

    var serialPort = require('serialport2').SerialPort;

    this.SERIAL_PORT = "/dev/rfcomm0";
    this.SERIAL_RATE = 115200;
    this.serial = new serialPort();

    return this;
};
util.inherits(OBDReader, EventEmitter);
OBDReader.prototype.connect = function () {
    var self = this; //Enclosure!

    this.serial.open(this.SERIAL_PORT, {
        baudRate: this.SERIAL_RATE,
        dataBits: 8,
        parity: 'none',
        stopBits: 1
    });

    ///Adding events
    this.serial.on('close', function (err) {
        console.log("Serial port [" + self.SERIAL_PORT + "] was closed");
    });

    this.serial.on('error', function (err) {
        console.log("Serial port [" + self.SERIAL_PORT + "] is not ready");
    });

    this.serial.on('open', function () {
        self.connected = true;
        console.log('connected');
        self.emit('connected');
        self.serial.write('010D\r');
    });

    this.serial.on("data", function (data) {
        var currentString, indexOfEnd;
        currentString = self.receivedData + data.toString('utf8'); // making sure it's a utf8 string
        indexOfEnd = currentString.lastIndexOf('\r\n>');

        if (indexOfEnd > -1) {
            var indexOfStart, reply;
            currentString = currentString.substr(0, indexOfEnd); //Discard end
            indexOfStart = currentString.lastIndexOf('\r\n'); //Find start
            currentString = currentString.substr(indexOfStart+2, currentString.length); //Discard start
            reply = parseOBDCommand(currentString);
            self.emit('dataReceived', reply);
            self.receivedData = "";
        } else {
            self.receivedData = currentString;
        }
    });

};

OBDReader.prototype.disconnect = function () {
    this.serial.close();
    this.connected = false;
};

OBDReader.prototype.write = function (message) {
    this.serial.write(message + '\r');
};

function getPIDByName(name) {
    var i;
    for (i = 0; i < PIDS.length; i++) {
        if (PIDS[i].name === name) {
            if (PIDS[i].pid !== undefined) {
                return (PIDS[i].mode + PIDS[i].pid);
            } else { //There are modes which don't require a extra parameter ID.
                return (PIDS[i].mode);
            }
        }
    }
}

OBDReader.prototype.requestValueByName = function (name) {
    this.write(getPIDByName(name));
};

var activePollers = [];

OBDReader.prototype.addPoller = function (name) {
    var stringToSend = getPIDByName(name);
    activePollers.push(stringToSend);
};

OBDReader.prototype.removePoller = function (name) {
    var stringToDelete = getPIDByName(name);
    var index = activePollers.indexOf(stringToDelete);
    activePollers.splice(index, 1);
};
//TODO Move this out of scope!
OBDReader.prototype.removeAllPollers = function () {
    activePollers.length = 0; //This does not delete the array, it just clears every element.
};

OBDReader.prototype.writePollers = function () {
    for (var i = 0; i < activePollers.length; i++) {
        this.write(activePollers[i]);
    }
};

var pollerInterval;
OBDReader.prototype.startPolling = function () {
    var self = this;
    pollerInterval = setInterval(function () { self.writePollers() }, 1000);
};

OBDReader.prototype.stopPolling = function () {
    clearTimeout(pollerInterval);
};

//TODO: Decide if should use 1 timeOut function, or more timeout functions for each PID separately.

function parseOBDCommand (hexString) {
    var reply = {}; //New object

    if(hexString === "NO DATA" || hexString === "OK"){ //No data or OK is the response.
        reply.value = hexString;
        return reply;
    }

    hexString = hexString.replace(/ /g, ''); //Whitespace trimming
    var valueArray = [];

    for (var byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
        valueArray.push(hexString.substr(byteNumber, 2));
    }

    reply.mode = valueArray[0];
    reply.pid = valueArray[1];

    for (var i = 0; i < PIDS.length; i++) {
        if(PIDS[i].pid == reply.pid) {
            var numberOfBytes = PIDS[i].bytes;
            reply.name = PIDS[i].name;
            switch (numberOfBytes)
            {
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
    return reply;
}

var exports = module.exports = OBDReader;
