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
var serialOBDReader = new OBDReader();
var dataReceivedMarker = new Object();

serialOBDReader.on('dataReceived', function (data) {
    var currentDate = new Date();
    console.log(currentDate.getTime());
    console.log(data);
    dataReceivedMarker = data;
});

serialOBDReader.on('connected', function (data) {
    //this.requestValueByName("vss"); //vss = vehicle speed sensor

//    this.addPoller("vss");
//    this.addPoller("rpm");
//    this.addPoller("temp");
//    this.addPoller("load_pct");
//    this.addPoller("map");
//    this.addPoller("frp");

    //this.startPolling();

    //Custom Poller
    var self = this;
    var interval = setInterval(function () {
        self.write('010D\r');
    }, 10);
});


serialOBDReader.connect();


