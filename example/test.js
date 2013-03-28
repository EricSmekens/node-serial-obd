(function () {
    'use strict';

    var serialPort = require("serialport2").SerialPort;

    var SERIAL_PORT = "/dev/rfcomm0";
    var SERIAL_RATE = 115200;
    var serial;

    try{
        serial = new serialPort();

        serial.open(SERIAL_PORT, {
            baudRate: SERIAL_RATE,
            dataBits: 8,
            parity: 'none',
            stopBits: 1
        });

        serial.on('close', function (err) {
            console.log("Serial port [" + SERIAL_PORT + "] was closed");
        });

        serial.on('error', function (err) {
            console.log("Serial port [" + SERIAL_PORT + "] is not ready");
        });

        serial.on('open', function () {
            serial.write('010D\r');
        });

        serial.on("data", function (chunk) {
            console.log(chunk.toString());
            return;
        });
    }
    catch(e){
        console.log("catch : " + e);
    }
}());