/*******************************************************************************
 *  Code contributed to the webinos project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	 http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Copyright 2013 TNO
 * Author - Eric Smekens
 *
 * This code should be ran with jasmine-node.
 ******************************************************************************/

describe("node-serial-obd", function () {
    'use strict';
    var OBDReader, serialOBDReader, dataReceivedMarker, options;
    OBDReader = require('../../lib/obd.js');

    options = {};
    options.baudrate = 115200;
    serialOBDReader = new OBDReader("/dev/rfcomm0", options);
    dataReceivedMarker = {}; //New object

    serialOBDReader.on('dataReceived', function (data) {
        console.log(data);
        dataReceivedMarker = data;
    });

    it("should be defined", function () {
        expect(serialOBDReader).toBeDefined();
    });

    it("has the necessary init properties as btOBDReader object", function () {
        //Functions
        expect(serialOBDReader.connect).toEqual(jasmine.any(Function));
        expect(serialOBDReader.disconnect).toEqual(jasmine.any(Function));
        expect(serialOBDReader.write).toEqual(jasmine.any(Function));
        expect(serialOBDReader.on).toEqual(jasmine.any(Function)); //Has events
        //TODO: check different events
        //Vars
        expect(serialOBDReader.connected).toEqual(false);
    });

    it("can connect to a bluetooth serial port", function () {
        serialOBDReader.connect();
        waitsFor(function () {
            return serialOBDReader.connected;
        }, "It took too long to connect.", 20000);
        runs(function () {
            expect(serialOBDReader.connected).toEqual(true);
            waits(5000); //Waiting for init strings to be sent and received!
        });


    });

    describe("the write function", function () {
        it("can write ascii to the obd-module", function () {
            dataReceivedMarker = false;
            serialOBDReader.write('010C'); //010C stands for RPM
        });

        it("can receive and convert the RPM-hex value to something right", function () {
            waitsFor(function () {
                return dataReceivedMarker;
            }, "Receiving time expired", 4000);
            runs(function () {
                expect(dataReceivedMarker).toEqual(jasmine.any(Object));
                expect(dataReceivedMarker.mode).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.pid).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.name).toEqual(jasmine.any(String));
                expect(!isNaN(dataReceivedMarker.value));//Number somehow crashes.
            });


        });

        it("can retrieve a value by name", function () {
            dataReceivedMarker = false;
            serialOBDReader.requestValueByName("vss"); //vss = vehicle speed sensor

            waitsFor(function () {
                return dataReceivedMarker;
            }, "Receiving time expired", 4000);
            runs(function() {
                expect(dataReceivedMarker).toEqual(jasmine.any(Object));
                expect(dataReceivedMarker.mode).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.pid).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.name).toEqual("vss");
                expect(!isNaN(dataReceivedMarker.value));//Number somehow crashes.
            });

        });
    });

    describe("pollers", function () {
        it("are defined", function () {
            //expect(btOBDReader.activePollers).toBeDefined(); //Not visible outside class.
            expect(serialOBDReader.addPoller).toBeDefined();
            expect(serialOBDReader.removePoller).toBeDefined();
            expect(serialOBDReader.removeAllPollers).toBeDefined();
            expect(serialOBDReader.startPolling).toBeDefined();
            expect(serialOBDReader.stopPolling).toBeDefined();
        });
        it("can be added", function () {
            dataReceivedMarker = false;
            serialOBDReader.addPoller("vss");
            serialOBDReader.startPolling(1000);
            waitsFor(function () {
                return dataReceivedMarker;
            }, "Receiving time expired", 12000);
            runs(function () {
                expect(dataReceivedMarker).toEqual(jasmine.any(Object));
                expect(dataReceivedMarker.mode).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.pid).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.name).toEqual("vss");
                expect(!isNaN(dataReceivedMarker.value));//Number somehow crashes.

                dataReceivedMarker = false;
            });

            //Wait second time without calling anything since last data reset. --> If data comes in, polling works.
            waitsFor(function () {
                return dataReceivedMarker;
            }, "Receiving time expired", 12000); //Time for polling.
            runs(function () {
                expect(dataReceivedMarker).toEqual(jasmine.any(Object));
                expect(dataReceivedMarker.mode).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.pid).toEqual(jasmine.any(String));
                expect(dataReceivedMarker.name).toEqual("vss");
                expect(!isNaN(dataReceivedMarker.value));
            });
        });
        it("can be removed", function () {
            runs(function () {
                serialOBDReader.removePoller("vss");
                serialOBDReader.stopPolling();
                waits(100);
                dataReceivedMarker = false;
                //Now, no data should come in.
            });

            waits(5000);

            runs(function () {
                expect(dataReceivedMarker).toEqual(false);
            });

        });
    });

    describe("DTC", function () { //Diagnostic trouble code
        it("can be counted", function () {
            dataReceivedMarker = false;
            serialOBDReader.write('0101', 1); //Count DTC
            waitsFor(function () {
                return dataReceivedMarker;
            }, "Receiving time expired", 4000);
            runs(function () {
                expect(!isNaN(dataReceivedMarker.value.mil) || dataReceivedMarker.value === 'NO DATA');
                expect(!isNaN(dataReceivedMarker.value.numberOfErrors) || dataReceivedMarker.value === 'NO DATA');
                if(dataReceivedMarker.value !== 'NO DATA')
                    expect(dataReceivedMarker.value.mil).toEqual(jasmine.any(Number));
                dataReceivedMarker = false;
            });
        });

        //For this test, you should enable a DTC in the simulator!
//        it("can be requested/read", function () {
//            dataReceivedMarker = false;
//            serialOBDReader.requestValueByName("requestdtc");
//            waitsFor(function () {
//                return dataReceivedMarker;
//            }, "Receiving time expired", 4000);
//            runs(function () {
//                expect(dataReceivedMarker.name).toEqual('requestdtc');
//                if(dataReceivedMarker.value !== 'NO DATA')
//                    expect(dataReceivedMarker.value.errors).toEqual(jasmine.any(Array));
//                dataReceivedMarker = false;
//            });
//            waits(1000);
//        });
        it("can be cleared", function () {
            dataReceivedMarker = false;
            serialOBDReader.requestValueByName("cleardtc");
            waitsFor(function () {
                return dataReceivedMarker;
            }, "Receiving time expired", 4000);
            runs(function () {
                expect(dataReceivedMarker.value).toEqual(jasmine.any(String));
                dataReceivedMarker = false;
            });
        });
    });

    /*  //Not supported with OBDsim.
     describe("can read the VIN", function() { //Vehicle Identification number
     it("can be sent", function(){
     dataReceivedMarker = false;
     btOBDReader.requestValueByName("vin");
     waitsFor(function () {
     return dataReceivedMarker;
     }, "Receiving time expired", 4000);
     runs(function() {
     expect(dataReceivedMarker).toEqual(jasmine.any(String));
     dataReceivedMarker = false;
     });
     });
     });*/



    it("can close the bluetooth serial port", function () {
        serialOBDReader.disconnect();
        waitsFor(function () {
            return !(serialOBDReader.connected);
        }, "Disconnect time expired", 2500); //Time for disconnect.
        runs(function () {
            expect(serialOBDReader.connected).toEqual(false);
            serialOBDReader = undefined;
        });

    });

});