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
        georep.user.set({
           	name: 'nome',
           	password: 'password',
           	nick: 'nomignolo',
           	mail: 'nomignolo@mail.com'
         });
       georep.db.setAdmin('pratesim', 'cou111Viola<3');
       georep.db.setDBName('places');
       georep.db.setURLServer({
       	proto: 'http://',
       	host: '192.168.0.118',
       	port: 5984
       });
        
    };
    /* prende i titoli, di tutte le segnalazioni effettuate dall'utente, dal server couchdb. 
     * Poi li inserisce nella listView */
	app.getDataFromServer = function(){
		georep.db.getUserDocs(georep.user._id, function(err, data){
			if (err != undefined){
				alert("Impossibile caricare i dati dal server");
			}
			else{
				$("#listViewContent").kendoMobileListView({
					/* data.rows è il vettore restituito dalla getUserDocs in caso di successo.
					 * Ogni elemento del vettore è del tipo {id: ..., key: ..., value: ...}
					 */
					dataSource: data.rows,
					click: function(e) {
					     console.log("value: " + e.dataItem.value + " id: " + e.dataItem.id);
					     /* devo aprire la view per la visualizzazione completa della segnalazione con id e.dataItem.id */
					     
					},
					/* in questo modo all'interno della lista viene visualizzato solo il campo value 
					 * (cioè il titolo della segnalazione). 
					 */
					template: "#:data.value#"
				});
			}
		});
	};
