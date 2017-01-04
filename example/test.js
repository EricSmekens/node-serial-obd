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

    this.startPolling(500);
});

serialOBDReader.on('error', function (data) {
  console.log('Error: ' + data);
	process.exit(1);
});

//serialOBDReader.on('debug', function (data) {
//  console.log('Debug: ' + data);
//});


serialOBDReader.connect();
