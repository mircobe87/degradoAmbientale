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
	
	/* dataSource per la listView */
	app.customerDataSource = new kendo.data.DataSource({ });
	
	/* oggetto che contiene i campi userId e docId di una particolare segnalazione*/
	app.query = {
			docId: "",
			userId: ""
	};
	app.dbName = 'places';
	//inizializza la mappa
	app.initMap = function(e){
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
		// aggiorna il contenuto della mappa quando si muove
		google.maps.event.addListener(app.map,'center_changed',app.updateMap);
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
	
	/* crea la listView per contenere le segnalazioni dell'utente */
	app.createViewList = function (){
		$("#listViewContent").kendoMobileListView({
			dataSource: app.customerDataSource,
			click: function(e) {
				 /* Ogni elemento della lista è un oggetto del tipo {id: ..., key: ..., value: ...}
				 */
				app.query.docId = e.dataItem.id;
				app.query.userId = e.dataItem.key;
			    /* devo aprire la view per la visualizzazione completa della segnalazione con id e.dataItem.id */
			    app.navigate("#view-repoDetail");
			},
			/* in questo modo all'interno della lista viene visualizzato solo il campo value 
			 * (cioè il titolo della segnalazione). 
			 */
			template: "#:value#"
		}); 
	};
    // Application Constructor
    app.initialize = function() {
        this.bindEvents();
        app.createViewList();
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
       /* georep.user.set({
           	name: 'mibe',
           	password: '1234',
           	nick: 'mirco',
           	mail: 'mibe@mail.com'
         });
       georep.db.setAdmin('mircobe87', 'COU0x7bemirco13');
       georep.db.setDBName('testdb');
       georep.db.setURLServer({
       	proto: 'http://',
       	host: 'mibe.homepc.it',
       	port: 5984
       });*/
        georep.user.set({
           	name: 'nome',
           	password: 'password',
           	nick: 'nomignolo',
           	mail: 'nomignolo@mail.com'
         });
       georep.db.setAdmin('pratesim', 'cou111Viola<3');
       georep.db.setDBName(app.dbName);
       georep.db.setURLServer({
       	proto: 'http://',
       	host: '192.168.0.105',
       	port: 5984
       });
    };
    /* prende i titoli, di tutte le segnalazioni effettuate dall'utente, dal server couchdb. 
     * Poi li inserisce nella listView */
	app.getDataFromServer = function(){
		georep.db.setDBName(app.dbName);
		georep.db.getUserDocs(georep.user._id, function(err, data){
			if (err != undefined){
				alert("Impossibile caricare i dati dal server");
			}
			else{
				/* inserisce i dati contenuti in data.rows nella listView.
				 * data.rows è il vettore restituito dalla getUserDocs in caso di successo.
				 * Ogni elemento del vettore è del tipo {id: ..., key: ..., value: ...}
				 */
				app.customerDataSource.data(data.rows);
			}
		});
	};
	
	/* permette di ottenere un indirizzo a partite da una latitudine e una longitudine */
	app.coordsToAddress = function (lat, lng, callback){
		var latlng = new google.maps.LatLng(lat, lng);
	    var geocoder = new google.maps.Geocoder();
	    geocoder.geocode({'latLng': latlng}, function(results, status) {
	      if (status == google.maps.GeocoderStatus.OK) {
	    	  callback(results[0].formatted_address);
	      } else {
	        alert("Geocoder failed due to: " + status);
	      }
	    });
	}
	/* carica la segnalazione completa */
	app.loadRepo = function(e){
	     georep.db.setDBName(app.dbName);
	     georep.db.getDoc(app.query.docId, true, function(err, data){
	    	 if (err != undefined){
	    		 alert(err);
	    	 }
	    	 else {
	    		 $("#descrizione").attr("value", data.msg);
	    		 $("#repoDetail-title").text(data.title);
	    		 $("#repoImg").attr("src", "data:"+data._attachments.img.content_type+";base64,"+data._attachments.img.data);
	    		 app.coordsToAddress(data.loc.latitude, data.loc.longitude, function(indirizzo){
	    			 $("#indirizzo").attr("value", indirizzo);
	    		 });
	    	 }
	     });
	     /* prendo il documento con i dati dell'utente che ha effettuato la segnalazione selezionata */
	     georep.db.setDBName('_users');
	     georep.db.getDoc(app.query.userId, false, function(err, data){
	    	 if (err != undefined){
	    		 alert(err);
	    	 }
	    	 else {
	    		 $("#nickName").attr("value", data.nick);
	    		 $("#mail").attr("value", data.mail);
	    	 }
	     });
	};
	
