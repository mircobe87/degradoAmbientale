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
 
/**
 * inizializza un applicazione KendoUI Mobile dal body della pagina e
 * all'inizializzazione naviga alla view delle impostazioni dell'utente
 */
var app = new kendo.mobile.Application($(document).body,{
	init: function(){
		app.navigate('#user-view');
	}
});

// ------- sezione MAPPA -------------------------------------------------------

/**
 * Le immagini dei segnaposto rispettivamente per:
 *  - posizione attuale
 *  - posizione delle segnalazioni dell'utente
 *  - posizione delle segnalazioni degli altri utenti
 */
app.MYLOC_MARKER = 'img/male-2.png';
app.MYDOCS_MARKER = 'img/radiation.png';
app.OTHERDOCS_MARKER = 'img/radiation-white.png';

/**
 * Riferimento alla mappa una volta istanziata
 */
app.map;

/**
 * Riferimento al segnaposto della posizione attuale
 */
app.markMyLoc;

/** 
 * Vettore dei marker delle segnalazioni sulla mappa
 */
app.markers = [];

/**
 * Riferimento al markCluster della mappa una volta istanziato.
 */
app.markCluster;

/**
 * Inizializza la mappa nel DOM con centro al 'Polo Fibonacci', successivamente
 * crea un segnaposto per la posizione attuale e lo setta ancora sul 'Polo
 * Fibonacci'; a questo punto si accede alla posizione vera e si aggiorna il 
 * centro della mappa e la posizione del segnaposto alla posizione attuale.
 */
app.initMap = function(e){
	//console.log("initmap");
	
	/** elemento nel DOM che conterra' la mappa */	
	var mapElement = $("#map")[0];
	
	/** configurazione della mappa */	
	var mapOptions = {
		center: new google.maps.LatLng(43.720741,10.408413),
		zoom: 10
	};
	
	/** istanzia la mappa */
	app.map = new google.maps.Map(mapElement, mapOptions);
	//console.log('mappa istanziata');
	/*app.geoMarker = new GeolocationMarker(app.map);*/
	
	/** configurazione del segnaposto per la posizione attuale */	
	var markOptions = {
		clickable: false,
		flat: true,
		icon: app.MYLOC_MARKER,
		map: app.map,
		position: new google.maps.LatLng(43.720741,10.408413)			
	};

	/** istanzio il segnaposto per la posizione attuale */
	app.markMyLoc = new google.maps.Marker(markOptions);
	
	/** configurazione del markClaster */
	var markClusterOptions = {
		averageCenter: true,
		gridSize: 24
	};
	
	/** istanzion un markCluster per la mappa senza segnaposti */
	app.markCluster = new MarkerClusterer(app.map,[],markClusterOptions);
	
	/**
	 * recupera la posizione attuale e riposizione il centro della mappa e il
	 * segnaposto.
	 */	
	navigator.geolocation.getCurrentPosition(function(pos){
		var lat = pos.coords.latitude;
		var lng = pos.coords.longitude;
		var newPosition = new google.maps.LatLng(lat,lng);
		//console.log("lat: "+lat + " lng: " + lng); 
		app.map.setCenter(newPosition);
		app.markMyLoc.setPosition(newPosition);
	});

	/**
	 * aggiorna il contenuto della mappa quando e' in 'idle' ovvero dopo
	 * ogni spostamento o zoom
	 */
	google.maps.event.addListener(app.map,'idle',app.updateMap);
};

/**
 * Rimuove tutti i marker dalla mappa e dalla memoria.
 */
app.clearMap = function(){
	for( var i=0, len=app.markers.length; i<len; i++){
		app.markers[i].setMap(undefined);
	}
	/** cancella i riferimenti dei marker */
	app.markers.length = 0;
	/** elimina i riferimenti che il claster ha dei marker */
	app.markCluster.clearMarkers();
};

/**
 * Setta lo handler dell'evento 'click' dei segnaposto per le segnalazioni.
 *
 * marker (google.maps.Marker)
 */
app.setUpMarkerClick = function(marker){
	/** handler dell'evento */
	var onClickHandler = function(){
		alert('hai cliccato sul marker con ID: ' + marker.docId);
		app.query.docId = marker.docId;
		app.navigate('#view-repoDetail');
	}
	/** setta lo handler per l'evento */
	google.maps.event.addListener(marker, 'click', onClickHandler);
};
	
/**
 * Aggiorna i marker sulla mappa.
 */
app.updateMap = function(){
	//console.log('hai mosso la mappa');
	/**
	 * rileva i limiti visualizzati nella mappa e costruisce i 2 angoli
	 * di riferimento per inoltrare la richiesta al server
	 */
	var mapBound = app.map.getBounds();
	var bl_corner = {
		lat: mapBound.getSouthWest().lat(),
		lng: mapBound.getSouthWest().lng()
	};
	var tr_corner = {
		lat: mapBound.getNorthEast().lat(),
		lng: mapBound.getNorthEast().lng()
	};

	/**
	 * chiedo al server tutte le segnalazioni che stanno sull'area
	 * della mappa visualizzata
	 */
	//georep.db.setDBName('testdb');
	georep.db.getDocsInBox(bl_corner, tr_corner, function(err, data){
		if(err){
			alert('updateMap: Impossibile contattare il server');
		}else{
			/** elimino i vecchi markers */
			app.clearMap();
			
			/** setta l'handler dell'evento click per un marker */
			
			
			/**
			 * per ogni documento che il server mi ha inviato io creo un
			 * marker, lo metto nel vettore e gli configuro un handler per
			 * l'evento click.
			 */
			for(var i=0, len=data.rows.length; i<len; i++){
				/** configurazioni per il nuovo marker */
				var markerOpt = {
					map: app.map,
					/**
					 * docId: property ausiliaria utile per quando si clicchera'
					 * sul marker: in questo modo possiamo chiedere al
					 * server il Doc tramite il suo ID
					 */
					docId: data.rows[i].id,
					position: new google.maps.LatLng(
						/** latitudine  (asse y) */
						data.rows[i].geometry.coordinates[1],
						/** longitudine (asse x) */ 
						data.rows[i].geometry.coordinates[0] 
					),
					icon: (data.rows[i].value == georep.user._id) ? app.MYDOCS_MARKER : app.OTHERDOCS_MARKER 
				}
				
				/** metto il nuovo marker nel vettore */
				app.markers[i] = new google.maps.Marker(markerOpt);
				//console.log("marker "+i+" fatto");
				
				/** setto il marker per rispondere all'evento di 'click' */
				app.setUpMarkerClick(app.markers[i]);
			}
			/** aggiungo i marker al cluster */
			app.markCluster.addMarkers(app.markers);
		}
	});
};

// sezione della LISTA SEGNALAZIONI --------------------------------------------

/* dataSource per la listView */
app.customerDataSource = new kendo.data.DataSource({ });
	
/* oggetto che contiene i campi userId e docId di una particolare segnalazione*/
app.query = {
	docId: "",
	userId: ""
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

/* prende i titoli, di tutte le segnalazioni effettuate dall'utente, dal server couchdb. 
 * Poi li inserisce nella listView */
app.getDataFromServer = function(){
	georep.db.setDBName(georep.db.name);
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
     georep.db.setDBName(georep.db.name);
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
    		 $("#nickName").attr("value", data.userNick);
    		 $("#mail").attr("value", data.userMail);
    	 }
     });
};

/*-------------------------Sezione vista segnalazione ------------------------*/
var segnalazione = {
	titolo: "",
	descrizione: "",
	imgbase64: "",
	lat: 0,
	lon: 0
};
/** 
 * avvia l'app fotocamera per scattare la foto da segnalare, se non ci sono errori, l'anteprima della foto viene 
 * mostrata nella pagina di segnalazione.
 */ 

app.getPhoto = function(){
	var cameraOptions = {
		  /*quality : 75,*/
		  destinationType : Camera.DestinationType.DATA_URL, // con DATA_URL viene restituita la stringa in base64
		  sourceType : Camera.PictureSourceType.CAMERA,
		  /*allowEdit : true,*/
		  encodingType: Camera.EncodingType.JPEG,
		  targetWidth: 100,
		  targetHeight: 100,
		  /*popoverOptions: CameraPopoverOptions,*/
		  saveToPhotoAlbum: true 
		
	};
	navigator.camera.getPicture(
			/* funzione chiamata quando lo scatto della foto ha avuto successo */
			function(imageData){
				alert(imageData);
				/*segnalazione.imgbase64 = imageData;*/
				/*$("#imgToRepo").attr("src", "data:image/jpeg;base64," + imageData);*/
			}, 
			/* funzione chiamata quando lo scatto della foto NON ha avuto successo */
			function(message){
				alert(message);
			}, cameraOptions);
};
	

// ------------------ sezione AVVIO & OPZIONI ----------------------------------

/**
 * Stringhe di default 'improbabili' rispettivamente per:
 *  - indirizzo email dell'utente
 *  - nick name dell'utente
 *
 * questi valori saranno relativi ad un utente nuovo o parzialmente registrato
 * sul server
 */
app.FAKE_MAIL = '-:RkFLRV9NQUlM:-';
app.FAKE_NICK = '-:RkFLRV9OSUNL:-';

/**
 * Configura il sistema per poter essere in grado di accedere al server remoto.
 * Per il nome dell'utente e la password si usa lo stesso valore che e' ottenuto
 * dall'identificatore universale del dispositivo.
 */
app.configServer = function(){
	//console.log(window.device);
	georep.user.set({
       	name: "nome",
       	password: "password",
       	nick: localStorage.userNick,
       	mail: localStorage.userMail
    });
	georep.db.setAdmin('pratesim', 'cou111Viola<3');
	georep.db.setDBName('testdb');
	georep.db.setURLServer({
		proto: 'http://',
		host: '192.168.0.111',
		port: 5984
	});
};

/**
 * Eseguita a tempo di inizializzazione della view del edit delle info dell'utente.
 *
 * Configura il gestore dell'evento 'click' del bottone della view delle info.
 * Il gestore recupera le info locali e quelle immesse dall'utente e le confronta:
 * se ci sono differenze allora scatena l'aggiornamento di tali informazioni,
 * altrimenti non considera i valori immessi e torna alla mappa.
 */
app.initOptionView = function(){
	$('#input-ok').on('click', function(){
		var currentNick = (localStorage.userNick == app.FAKE_NICK)?'':localStorage.userNick;
		var currentMail = (localStorage.userMail == app.FAKE_MAIL)?'':localStorage.userMail;
		var newNick = $('#input-nick')[0].value;
		var newMail = $('#input-mail')[0].value;
		console.log('newNick: ' + newNick);
		console.log('newMail: ' + newMail);
		if(newNick != currentNick || newMail != currentMail)
			app.saveOptions(newNick, newMail);
		else {
			/**
			 * qui la mappa non viene inizializzata perche' questo ramo viene eseguito
			 * solo se ci sono gia' delle info valide configurate e quindi la mappa
			 * e' gia' stata configurata.
			 */
			app.navigate('#map-view');	
		}
	});
};

/**
 * Funzione eseguita ogni volta che viene mostrata la view delle opzioni.
 * 
 * Vengono caricati i valori locali delle inputbox della view; se i valori
 * locali sono 'fake' vengono caricate stringhe vuote cosi che l'utente e'
 * obbligato ad inserire valori consistenti per andare avanti (vedere lo handler
 * del click sul bottone della view delle opzioni).
 */
app.showOptionView = function(){
	var currentNick = (localStorage.userNick == app.FAKE_NICK)?'':localStorage.userNick;
	var currentMail = (localStorage.userMail == app.FAKE_MAIL)?'':localStorage.userMail;
	$('#input-nick').attr('value',currentNick);
	$('#input-mail').attr('value',currentMail);
};

/**
 * Controlla se la app e' al primo avvio o se l'utente non e' stato configurato
 * completamente l'ultima volta (si e' riusciti ad aggiungere l'utente sul server
 * ma per qualche motivo e' fallito l'aggiornamento delle sui informazioni).
 *
 * In ogni caso inizializza un utente con info fittizie e controlla se tale
 * utente esiste sul server, se esiste scarica le sue info e se scopre che sono
 * 'fasulle' (quelle di default) rimane nella view opzioni altrimenti aggiorna
 * la configurazione locale a passa alla view della mappa.
 * Se l'utente non esiste lo crea e rimena nella view delle opzioni.
 */
app.loader = function() {
	if(!localStorage.userNick || localStorage.userNick == app.FAKE_NICK ||
	   !localStorage.userMail || localStorage.userMail == app.FAKE_MAIL ){
	   console.log('nuovo utente o incompleto');
		/**
		 * a questo punto o e' il primo avvio oppure sono stati cancellati 
		 * i dati della app oppure e' stato creato un utente non si e' riusciti
		 * ad aggiornare le sue opzioni.
		 */
		
		/** creo delle opzioni 'fake' */
		localStorage.userNick = app.FAKE_NICK;
		localStorage.userMail = app.FAKE_MAIL;
		app.configServer();
		
		/** controllo se l'utente esiste sul server */
		georep.user.check(function(err, data){
			if(!err){
				if(data.isRegistered){
					//console.log('utente gia' registrato');
					/**
					 * l'utente esiste sul server quindi bisogna scaricare le sue info
					 * per correggere le opzioni 'fake'.
					 */
					georep.user.getRemote(function(err,data){
						if(!err){
							/**
							 * Se i dati scaricati sono ok li memorizzo e passo alla mappa
							 */
							if(data.nick != app.FAKE_NICK && data.mail != app.FAKE_MAIL){
								console.log('dati utente registrato recuperati');
								localStorage.userNick=data.nick;
								localStorage.userMail=data.mail;
								app.configServer();
								
								app.initMap();
								app.navigate('#map-view');
							}else{
								/**
								 * se i dati scaricati sono da sistemare si rimane qui nella
								 * view delle opzioni
								 */
								//console.log('utente registrato ma da completare');
							}
						}else{
							alert('Impossibile contattare il server per scaricare le opzioni dell\'utente.');
						}
					});
					
				}else{
					/**
					 * L'utente non esiste quindi bisogna registrarlo
					 * Viene inizialmente fatto un utente con info 'fake' e successivamente si
					 * aggiornano le sue informazioni.
					 */
					console.log('utente nuovo');

					georep.user.signup(function(err,data){
						if(!err){
							console.log('utente creato sul server');
							/**
							 * A questo punto l'utente e' stato creato ma bisogna raccoglie le
							 * le informazione su email e nick e quindi si rimane in questa view
							 * delle opzioni.
							 */
						}else{
							alert('Impossibile comunicare con il server: utente non creato');
							/**
							 * non si e' riusciti a creare l'utente nuovo sul server quindi si
							 * eliminano le info 'fake' locali cosi' da ripulire l'ambiente per
							 * il prossimo avvio della app.
							 */
							 localStorage.clear();
						}
					});
				}
			}else{
				/** impossibile controllare se l'utente e' registrato */
				alert('loader: Impossibile contattare il server');
			}
		});
	} else {
		/**
		 * localmente sono presenti info non 'fake' e quindi si presume che l'utente
		 * sia gia' registrato sul server.
		 * Si configura il sistema con queste info e ci si sposta sulla view della mappa
		 */
		app.configServer();
		app.initMap();
		app.navigate('#map-view');
	}
};

/**
 * Si occupa di aggiornare le info locali e remote dell'utente
 * con i valori passatole come parametri
 */ 
app.saveOptions = function(nick, mail){
	if (!nick || !mail)
		alert('Inserire NickName e E-Mail');
	else {
		/**
		 * Aggiorna le info dell'utente sia sul server che locali (configurazioni
		 * di georep).
		 */
		georep.user.update({
			name: georep.user.name,
			password: georep.user.password,
			nick: nick,
			mail: mail
		},function(err, data){
			if(!err){
				/**
				 * Se l'utente e' stato aggiornato memorizzo localmente in modo
				 * 'permanente' le nuove informazioni.
				 */
				localStorage.userNick = nick;
				localStorage.userMail = mail;
				
				console.log("salvato in locale 'nick': " + localStorage.userNick);
				console.log("salvato in locale 'mail': " + localStorage.userMail);
				
				/** riaggiorno la config del sistema con le nuove info */
				app.configServer();
				
				/**
				 * Questo controllo ha senso perche' questa funzione puo' venir chiamata
				 * anche piu' volte nella app e quindi evito di fare del casino inizializzando
				 * piu' volte la mappa
				 */
				if(!app.map)
					app.initMap();
				app.navigate('#map-view');
			}else{
				alert('Impossibile contattare il server: aggiornamento non riuscito.');
			}
		});
	}
};

/**
 * Funzione che deve essere eseguita per prima quando l'intera pagina e stata
 * completamente caricata.
 */
app.initialize = function() {
    this.bindEvents();
	app.createViewList();
};

/**
 * Registra i listeners degli eventi necessari in fase di avvio.
 * In questo caso solo quello da eseguire quando le api di Cordova sono
 * disponibili
 */
app.bindEvents = function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
};

/**
 * Gestore dell'evento 'deviceready' eseguito quando le api cordova sono pronte.
 * In questo caso scatena il controllo dell'utente ed eventuale registrazione.
 */
app.onDeviceReady = function() {
    app.loader();
};

//-------------------- per la simulazione nel browser --------------------------	
window.device = {uuid: "mibe"};
