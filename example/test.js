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
 ******************************************************************************/


var OBDReader = require('../lib/obd.js');
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

    this.startPolling(1000);
});

serialOBDReader.on('error', function (data) {
  console.log('Error: ' + data);
	process.exit(1);
});

//serialOBDReader.on('debug', function (data) {
//  console.log('Debug: ' + data);
//});


serialOBDReader.connect();
