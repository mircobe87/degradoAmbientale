/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = new kendo.mobile.Application($(document).body);
    // Application Constructor
    app.initialize = function() {
        this.bindEvents();
    };
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    app.bindEvents = function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    };
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    app.onDeviceReady = function() {
        app.receivedEvent('deviceready');
    };
    // Update DOM on a Received Event
    app.receivedEvent = function(id) {
        $("#cordova").text("");
    };
	app.getDataFromServer = function(){
		/*getUserDoc(georep.user._id, function(err, data){
			if (err != undefined){
				alert("Impossibile caricare i dati dal server");
			}
			else{
				var title_list = [];
				var id_list = [];
				for (var i = 0; i < data.total_rows; i++){
					title_list[i] = data.rows.value[i];
					id_list[i]= data.rows.id[i];
				}
				$("#listViewContent").kendoMobileListView({dataSource: title_list});
			}
		});*/
		var title_list = ["titolo1", "titolo2", "titolo3"];
		$("#listViewContent").kendoMobileListView({dataSource: title_list});
	};
