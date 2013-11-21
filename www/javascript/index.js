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

	app.provaInitMap = function(){
		console.log('prova init mappa');
	};

	//inizializza la mappa
	app.initMap = function(e){
	console.log("initmap");
		var mapElement = $("#map");
		//var container = e.view.content;
		
		var mapOptions = {
			center: new google.maps.LatLng(43.720741,10.408413),
			zoom: 10
		};
		app.map = new google.maps.Map(mapElement[0], mapOptions);
		/*app.geoMarker = new GeolocationMarker(app.map);*/
		
		var markOptions = {
			clickable: false,
			flat: true,
			icon: '/img/male-2.png',
			map: app.map,
			position: new google.maps.LatLng(43.720741,10.408413)			
		};
		app.markMyLoc = new google.maps.Marker(markOptions);
		
		navigator.geolocation.getCurrentPosition(function(pos){
			var lat = pos.coords.latitude;
			var lng = pos.coords.longitude;
			var newPosition = new google.maps.LatLng(lat,lng);
			console.log("lat: "+lat + " lng: " + lng); 
			app.map.setCenter(newPosition);
			app.markMyLoc.setPosition(newPosition);
		});
		// aggiorna il contenuto della mappa quando termina il trascinamento.
		google.maps.event.addListener(app.map,'dragend',app.updateMap);
		// aggiorna il contenuto della mappa quando cambia il livello di zoom.
		google.maps.event.addListener(app.map,'zoom_changed',app.updateMap);
	};
	
	// vettore dei marker delle segnalazioni sulla mappa
	app.markers = [];
	
	// rimuove tutti i marker dalla mappa e dalla memoria
	app.clearMap = function(){
		for( var i=0, len=app.markers.length; i<len; i++){
			app.markers[i].setMap(undefined);
		}
		app.markers.length = 0; // cancella i riferimenti dei marker
	};
	// aggiorna i marker sulla mappa
	
	app.updateMap = function(){
		console.log('hai mosso la mappa');
		// rileva i limiti visualizzati nella mappa e costruisce i 2 angoli
		// di riferimento per inoltrare la richiesta al server
		var mapBound = app.map.getBounds();
		var bl_corner = {
			lat: mapBound.getSouthWest().lat(),
			lng: mapBound.getSouthWest().lng()
		};
		var tr_corner = {
			lat: mapBound.getNorthEast().lat(),
			lng: mapBound.getNorthEast().lng()
		};

		// chiedo al server tutte le segnalazioni che stanno sull'area
		// della mappa visualizzata
		georep.db.setDBName('testdb');
		georep.db.getDocsInBox(bl_corner, tr_corner, function(err, data){
			if(err){
				alert('Impossobole contattare il server');
			}else{
			
				app.clearMap(); // cancello i vecchi marker
				
				// setta l'handler dell'evento click per un marker
				var setUpMarckerClick = function(marker){
					google.maps.event.addListener(marker, 'click', function(){
						alert('hai cliccato sul marker con ID: ' + marker.docId);
					});
				};
				
				// per ogni documento che il server mi ha inviato io creo un
				// marker e lo metto nel vettore e gli configuro un handler per
				// l'evento click
				for(var i=0, len=data.rows.length; i<len; i++){
					var markerOpt = {
						map: app.map,
						docId: data.rows[i].id, // properti ausiliaria utile per quando si clicchera'
						                        // sul marker: in questo modo possiamo chiedere al
						                        // server il Doc tramite il suo ID
						position: new google.maps.LatLng(
							data.rows[i].geometry.coordinates[1], // latitudine  (asse y)
							data.rows[i].geometry.coordinates[0]  // longitudine (asse x)
						),
						icon: (data.rows[i].value == georep.user._id)?'/img/radiation.png':'/img/radiation-white.png'
					}
					// metto nel vettore il nuovo marker
					app.markers[i] = new google.maps.Marker(markerOpt);
					// setto il marker per rispondere all'evento di click
					setUpMarckerClick(app.markers[i]);
				}
			}
		});
	};
	
	// carica la view di startup se e' il primo avvio
	// altrimenti carica la mappa.
	app.loader = function() {
		if(!localStorage.userNick || !localStorage.userMail){
			app.navigate('#startup-view');
			//$('#startup-input-ok').on('click',app.saveOptions);
		} else {
			app.configServer();
			app.updateMap();
			app.navigate('#:back');
		}
	};
	
	// aggiorna le ozioni dell'utente.
	app.saveOptions = function(nick, mail){
//		var nick = $('#startup-input-nick')[0].value;
//		var mail = $('#startup-input-mail')[0].value;
		if (!nick || !mail)
			alert('Inserire NickName e E-Mail');
		else {
			// aggiornare le info sul server e poi fare il seguente:
			georep.user.update({
				name: georep.user.name,
				password: georep.user.password,
				nick: nick,
				mail: mail
			},function(err, data){
				if(!err){
					localStorage.userNick = nick;
					localStorage.userMail = mail;
					console.log("salvato in locale 'nick': " + localStorage.userNick);
					console.log("salvato in locale 'mail': " + localStorage.userMail);
			
					app.configServer();
					app.updateMap();
					app.navigate('#:back');
				}else{
					alert('Impossibile contattare il server: aggiornamento non riuscito.');
				}
			});
		}
	};
	app.initStartupView = function(){
		$('#startup-input-ok').on('click',function(){
			var nick = $('#startup-input-nick')[0].value;
			var mail = $('#startup-input-mail')[0].value;
			app.saveOptions(nick, mail);
		});
	};
	app.showOptionView = function(){
		var currentNick = localStorage.userNick;
		var currentMail = localStorage.userMail;
		$('#input-nick').attr('value',currentNick);
		$('#input-mail').attr('value',currentMail);
	};
	app.initOptionView = function(){
		$('#input-ok').on('click', function(){
			var currentNick = localStorage.userNick;
			var currentMail = localStorage.userMail;
			var newNick = $('#input-nick')[0].value;
			var newMail = $('#input-mail')[0].value;
			console.log('newNick: ' + newNick);
			console.log('newMail: ' + newMail);
			if(newNick != currentNick || newMail != currentMail)
				app.saveOptions(newNick, newMail);
			else
				app.navigate('#:back');
		});
	};
	
	// configura tutte le credenziali per la cominicazione con il server
	// del database.
	app.configServer = function(){
		georep.user.set({
	       	name: 'mibe',
	       	password: '1234',
	       	nick: localStorage.userNick,
	       	mail: localStorage.userMail
	    });
		georep.db.setAdmin('mircobe87', 'COU0x7bemirco13');
		georep.db.setDBName('testdb');
		georep.db.setURLServer({
			proto: 'http://',
			host: '192.168.0.2',
			port: 5984
		});
	};
	
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
        //app.receivedEvent('deviceready');
        app.loader();
    };
    
    // Update DOM on a Received Event
    app.receivedEvent = function(id) {
        $("#cordova").text("");
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
