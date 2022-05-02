/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * (C) Copyright 2013, TNO
 * Author: Eric Smekens
 */
"use strict";
//Used for event emitting.
import { EventEmitter } from "events";

import SerialPort from "serialport";

/**
 * obdInfo.js for all PIDS.
 * @type {*}
 */
import PIDS from "../lib/obdInfo.js";

/**
 * Constant for defining delay between writes.
 * @type {number}
 */
const writeDelay = 50;

/**
 * Queue for writing
 * @type {Array}
 */
const queue = [];

let lastSentCommand = "";

/**
 * Creates an instance of OBDReader.
 * @constructor
 * @param {string} portName Port that will be connected to. For example: "/dev/rfcomm0"
 * @param {Object} options Object that contains options, e.g. baudrate, databits. Same options serialport module uses.
 * @this {OBDReader}
 */
class OBDReader extends EventEmitter {
    constructor(portName, options) {
        super();
        EventEmitter.call(this);
        this.connected = false;
        this.receivedData = "";
        this.awaitingReply = false;
        this.SERIAL_PORT = portName;
        this.OPTIONS = options;

        return this;
    }
    /**
     * Connect/Open the serial port and add events to serial-port.
     * Also starts the .pushWriter that is used to write the queue.
     * @this {OBDReader}
     */
    connect() {
        const self = this; //Enclosure

        this.serial = new SerialPort(this.SERIAL_PORT, this.OPTIONS);

        this.serial.on("close", function (_err) {
            console.log("Serial port [" + self.SERIAL_PORT + "] was closed");
        });

        this.serial.on("error", function (_err) {
            console.log("Serial port [" + self.SERIAL_PORT + "] is not ready");
        });

        this.serial.on("open", function () {
            self.connected = true;

            //self.write('ATZ');
            //Turns off echo.
            self.write("ATE0");
            //Turns off extra line feed and carriage return
            self.write("ATL0");
            //This disables spaces in in output, which is faster!
            self.write("ATS0");
            //Turns off headers and checksum to be sent.
            self.write("ATH0");
            //Turn adaptive timing to 2. This is an aggressive learn curve for adjusting the timeout. Will make huge difference on slow systems.
            self.write("ATAT2");
            //Set timeout to 10 * 4 = 40msec, allows +20 queries per second. This is the maximum wait-time. ATAT will decide if it should wait shorter or not.
            self.write("ATST0A");
            //Set the protocol to automatic.
            self.write("ATSP0");

            //Event connected
            self.emit("connected");
        });

        this.serial.on("data", function (data) {
            const currentString = self.receivedData + data.toString("utf8"); // making sure it's a utf8 string

            const arrayOfCommands = currentString.split(">");

            if (arrayOfCommands.length < 2) {
                self.receivedData = arrayOfCommands[0];
            } else {
                for (
                    let commandNumber = 0;
                    commandNumber < arrayOfCommands.length;
                    commandNumber++
                ) {
                    const forString = arrayOfCommands[commandNumber];
                    if (forString === "") {
                        continue;
                    }

                    const multipleMessages = forString.split("\r");
                    for (
                        let messageNumber = 0;
                        messageNumber < multipleMessages.length;
                        messageNumber++
                    ) {
                        const messageString = multipleMessages[messageNumber];
                        if (messageString === "") {
                            continue;
                        }

                        self.emit("debug", "in    " + messageString);

                        const reply = parseOBDCommand(messageString);
                        self.emit("dataReceived", reply);

                        if (self.awaitingReply == true) {
                            self.awaitingReply = false;
                            self.emit("processQueue");
                        }
                        self.receivedData = "";
                    }
                }
            }
        });

        //this.serial = serial; //Save the connection in OBDReader object.
        this.on("processQueue", function () {
            if (self.awaitingReply == true) {
                self.emit("debug", "processQueue: awaitingReply true");
            } else {
                if (queue.length > 0 && self.connected) {
                    try {
                        self.awaitingReply = true;
                        self.emit("debug", "out   " + queue[0]);
                        lastSentCommand = queue[0];
                        self.serial.write(queue.shift() + "\r");
                    } catch (err) {
                        console.log("Error while writing: " + err);
                        console.log(
                            "OBD-II Listeners deactivated, connection is probably lost."
                        );
                        self.removeAllPollers();
                    }
                }
            }
        });
        return this;
    }
    /**
     * Disconnects/closes the port.
     * @this {OBDReader}
     */
    disconnect() {
        clearInterval(this.intervalWriter);
        queue.length = 0; //Clears queue
        this.serial.close();
        this.connected = false;
    }
    /**
     * Writes a message to the port. (Queued!) All write functions call this function.
     * @this {OBDReader}
     * @param {string} message The PID or AT Command you want to send. Without \r or \n!
     * @param {number} replies The number of replies that are expected. Default = 0. 0 --> infinite
     * AT Messages --> Zero replies!!
     */
    write(message, replies) {
        if (replies === undefined) {
            replies = 0;
        }
        if (this.connected) {
            if (queue.length < 256) {
                this.emit("debug", "queue " + message + replies);
                if (replies !== 0) {
                    queue.push(message + replies);
                } else {
                    queue.push(message);
                }

                if (this.awaitingReply == false) {
                    this.emit("processQueue");
                }
            } else {
                console.log("Queue-overflow!");
            }
        } else {
            console.log("OBD Serial device is not connected.");
        }
    }
    /**
     * Writes a PID value by entering a pid supported name.
     * @this {OBDReader}
     * @param {string} name Look into obdInfo.js for all PIDS.
     */
    requestValueByName(name) {
        this.write(getPIDByName(name));
    }
    /**
     * Adds a poller to the poller-array.
     * @this {OBDReader}
     * @param {string} name Name of the poller you want to add.
     */
    addPoller(name) {
        const stringToSend = getPIDByName(name);
        activePollers.push(stringToSend);
    }
    /**
     * Removes an poller.
     * @this {OBDReader}
     * @param {string} name Name of the poller you want to remove.
     */
    removePoller(name) {
        const stringToDelete = getPIDByName(name);
        const index = activePollers.indexOf(stringToDelete);
        activePollers.splice(index, 1);
    }
    /**
     * Removes all pollers.
     * @this {OBDReader}
     */
    removeAllPollers() {
        activePollers.length = 0; //This does not delete the array, it just clears every element.
    }
    /**
     * Writes all active pollers.
     * @this {OBDReader}
     */
    writePollers() {
        for (let i = 0; i < activePollers.length; i++) {
            this.write(activePollers[i], 1);
        }
    }
    /**
     * Starts polling. Lower interval than activePollers * 50 will probably give buffer overflows. See writeDelay.
     * @this {OBDReader}
     * @param {number} interval Frequency how often all constiables should be polled. (in ms). If no value is given, then for each activePoller 75ms will be added.
     */
    startPolling(interval) {
        if (interval === undefined) {
            interval = activePollers.length * (writeDelay * 2); //Double the delay, so there's room for manual requests.
        }

        const self = this;
        pollerInterval = setInterval(function () {
            self.writePollers();
        }, interval);
    }
    /**
     * Stops polling.
     * @this {OBDReader}
     */
    stopPolling() {
        clearInterval(pollerInterval);
    }
}
/**
 * Find a PID-value by name.
 * @param name Name of the PID you want the hexadecimal (in ASCII text) value of.
 * @return {string} PID in hexadecimal ASCII
 */
function getPIDByName(name) {
    for (let i = 0; i < PIDS.length; i++) {
        if (PIDS[i].name === name) {
            if (PIDS[i].pid !== undefined) {
                return PIDS[i].mode + PIDS[i].pid;
            }
            //There are modes which don't require a extra parameter ID.
            return PIDS[i].mode;
        }
    }
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
    const reply = {};
    if (
        hexString === "NO DATA" ||
        hexString === "OK" ||
        hexString === "?" ||
        hexString === "UNABLE TO CONNECT" ||
        hexString === "SEARCHING..."
    ) {
        //No data or OK is the response. Return directly.
        reply.value = hexString;
        return reply;
    }

    hexString = hexString.replace(/ /g, ""); //Whitespace trimming //Probably not needed anymore?
    const valueArray = [];

    for (let byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
        valueArray.push(hexString.substr(byteNumber, 2));
    }

    if (valueArray[0] === "41") {
        reply.mode = valueArray[0];
        reply.pid = valueArray[1];
        for (let i = 0; i < PIDS.length; i++) {
            if (PIDS[i].pid == reply.pid) {
                const numberOfBytes = PIDS[i].bytes;
                reply.name = PIDS[i].name;
                switch (numberOfBytes) {
                    case 1:
                        reply.value = PIDS[i].convertToUseful(valueArray[2]);
                        break;
                    case 2:
                        reply.value = PIDS[i].convertToUseful(
                            valueArray[2],
                            valueArray[3]
                        );
                        break;
                    case 4:
                        reply.value = PIDS[i].convertToUseful(
                            valueArray[2],
                            valueArray[3],
                            valueArray[4],
                            valueArray[5]
                        );
                        break;
                    case 8:
                        reply.value = PIDS[i].convertToUseful(
                            valueArray[2],
                            valueArray[3],
                            valueArray[4],
                            valueArray[5],
                            valueArray[6],
                            valueArray[7],
                            valueArray[8],
                            valueArray[9]
                        );
                        break;
                }
                break; //Value is converted, break out the for loop.
            }
        }
    } else if (valueArray[0] === "43") {
        reply.mode = valueArray[0];
        for (let i = 0; i < PIDS.length; i++) {
            if (PIDS[i].mode == "03") {
                reply.name = PIDS[i].name;
                reply.value = PIDS[i].convertToUseful(
                    valueArray[1],
                    valueArray[2],
                    valueArray[3],
                    valueArray[4],
                    valueArray[5],
                    valueArray[6]
                );
            }
        }
    }
    return reply;
}

const activePollers = [];

let pollerInterval;

export default OBDReader;
