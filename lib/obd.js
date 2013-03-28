var async       = require('async');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var PIDS = require('../lib/obdInfo.js');


//
'use strict';
// Class OBDReader
OBDReader = function() {

    EventEmitter.call(this);
    this.connected = false;
    this.receivedData = "";

    var serialPort = require("serialport2").SerialPort;
    //var self = this; //Enclosure for event & this referencing.

    this.SERIAL_PORT = "/dev/rfcomm0";
    this.SERIAL_RATE = 115200;
    this.serial = new serialPort();

    return this;
};
util.inherits(OBDReader, EventEmitter);
OBDReader.prototype.connect = function(callback) {
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
        //Opened, now what?
        self.connected = true;
        console.log('connected');
        self.emit('connected');
        self.serial.write('010D\r');
    });

    this.serial.on("data", function (data) {
        var currentString;
        currentString = self.receivedData + data.toString('utf8'); // making sure it's a utf8 string
        var indexOf41 = currentString.indexOf('41');
        var indexOfEnd = currentString.indexOf('>');

        if ( indexOf41 > -1 && indexOfEnd > -1 ) {
            //Discard everything before 41, no useful data here.
            currentString = currentString.substring(indexOf41, currentString.length);
            // Discard everything after >, no data here
            indexOfEnd = currentString.indexOf('>'); //Recalculate again if there are more '>'
            currentString = currentString.substring(0, indexOfEnd);

            currentString = currentString.replace(/>/g, '');
            currentString = currentString.replace(/\n/g, '');
            currentString = currentString.replace(/\r/g, '');
            var reply = parseOBDCommand(currentString);
            self.emit('dataReceived', reply);
            self.receivedData = "";
        } else {
            self.receivedData = currentString;
        }
        return;
    });

};

OBDReader.prototype.disconnect = function() {
    this.serial.close();
    this.connected = false;
}

OBDReader.prototype.write = function(message) {

    this.serial.write(message + '\r');
}

OBDReader.prototype.requestValueByName = function(name) {
    for (var i = 0; i < PIDS.length; i++) {
        if(PIDS[i].name === name) {
            this.write(PIDS[i].mode + PIDS[i].pid);
        }
    }
}

var activePollers = [];

OBDReader.prototype.addPoller = function(name) {
    activePollers.push(name);
}

OBDReader.prototype.removePoller = function(name) {
    var index = activePollers.indexOf(name);
    activePollers.splice(index, 1);
}

OBDReader.prototype.removeAllPollers = function() {
    activePollers.length = 0; //This does not delete the array, it just clears every element.
}

//Some problems here with closure.
OBDReader.prototype.writePollers = function () {
    for (var i = 0; i < activePollers.length; i++) {
        this.requestValueByName(activePollers[i]);
    }
}

var pollerInterval;
OBDReader.prototype.startPolling = function() {
    var self = this;
    pollerInterval = setInterval(function() { self.writePollers() }, 1000);
}

OBDReader.prototype.stopPolling = function() {
    clearTimeout(pollerInterval);
}

//TODO: Decide if should use 1 timeOut function, or more timeout functions for each PID seperately.

function parseOBDCommand(hexString){
    hexString = hexString.replace(/ /g, ''); //Whitespacetrimmer
    var valueArray = [];

    for (var i = 0; i < hexString.length; i += 2) {
        valueArray.push(hexString.substr(i, 2));
    }

    var reply = new Object();
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
